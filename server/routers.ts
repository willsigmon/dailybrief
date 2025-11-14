import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { generateDailyBriefing } from "./services/briefingGenerator";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  briefing: router({
    // Get the latest briefing with all related data
    getLatest: protectedProcedure.query(async () => {
      const briefing = await db.getLatestBriefing();
      if (!briefing) return null;

      const [alerts, calendarEvents, llmAnalyses] = await Promise.all([
        db.getAlertsByBriefingId(briefing.id),
        db.getCalendarEventsByBriefingId(briefing.id),
        db.getLlmAnalysesByBriefingId(briefing.id),
      ]);

      return {
        briefing,
        alerts,
        calendarEvents,
        llmAnalyses,
      };
    }),

    // Get briefing by ID
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const briefing = await db.getBriefingById(input.id);
        if (!briefing) return null;

        const [alerts, calendarEvents, llmAnalyses] = await Promise.all([
          db.getAlertsByBriefingId(briefing.id),
          db.getCalendarEventsByBriefingId(briefing.id),
          db.getLlmAnalysesByBriefingId(briefing.id),
        ]);

        return {
          briefing,
          alerts,
          calendarEvents,
          llmAnalyses,
        };
      }),

    // Mark alert as complete/incomplete
    toggleAlert: protectedProcedure
      .input(z.object({
        id: z.number(),
        completed: z.boolean(),
      }))
      .mutation(async ({ input }) => {
        await db.updateAlertCompletion(input.id, input.completed);
        return { success: true };
      }),
  }),

  relationships: router({
    // Get all relationships
    getAll: protectedProcedure.query(async () => {
      return await db.getAllRelationships();
    }),
  }),

  generate: router({
    // Generate a new daily briefing
    dailyBriefing: protectedProcedure.mutation(async () => {
      try {
        const briefingId = await generateDailyBriefing();
        return { success: true, briefingId };
      } catch (error) {
        console.error('[API] Briefing generation failed:', error);
        throw new Error('Failed to generate briefing');
      }
    }),
  }),
});

export type AppRouter = typeof appRouter;
