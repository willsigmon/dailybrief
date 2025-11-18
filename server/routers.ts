import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { briefingRepository } from "./repositories/briefing.repo";
import { alertRepository } from "./repositories/alert.repo";
import { relationshipRepository } from "./repositories/relationship.repo";
import { calendarRepository } from "./repositories/calendar.repo";
import { llmAnalysisRepository } from "./repositories/llm.repo";
import { generateDailyBriefing } from "./services/briefingGenerator";
import { briefingGenerationRateLimiter, getClientId } from "./_core/rateLimiter";
import { logger, logError } from "./_core/logger";

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
      const briefing = await briefingRepository.getLatest();
      if (!briefing) return null;

      const [alerts, calendarEvents, llmAnalyses] = await Promise.all([
        alertRepository.getByBriefingId(briefing.id),
        calendarRepository.getByBriefingId(briefing.id),
        llmAnalysisRepository.getByBriefingId(briefing.id),
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
        const briefing = await briefingRepository.getById(input.id);
        if (!briefing) return null;

        const [alerts, calendarEvents, llmAnalyses] = await Promise.all([
          alertRepository.getByBriefingId(briefing.id),
          calendarRepository.getByBriefingId(briefing.id),
          llmAnalysisRepository.getByBriefingId(briefing.id),
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
        await alertRepository.updateCompletion(input.id, input.completed);
        return { success: true };
      }),
  }),

  relationships: router({
    // Get all relationships
    getAll: protectedProcedure.query(async () => {
      return await relationshipRepository.getAll();
    }),
  }),

  generate: router({
    // Generate a new daily briefing
    // Rate limited to prevent abuse
    dailyBriefing: protectedProcedure
      .input(z.object({ sessionId: z.string().optional() }).optional())
      .mutation(async ({ input, ctx }) => {
        // Check rate limit
        const clientId = getClientId(ctx.req);
        const rateLimitResult = briefingGenerationRateLimiter.check(clientId);

        if (!rateLimitResult.allowed) {
          logger.warn('Briefing generation rate limit exceeded', {
            clientId,
            userId: ctx.user?.id,
          });
          throw new Error(`Rate limit exceeded. Please wait ${Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000 / 60)} minutes before generating another briefing.`);
        }

        try {
          const sessionId = input?.sessionId;
          const briefingId = await generateDailyBriefing(sessionId);
          logger.info('Briefing generation completed via API', {
            briefingId,
            sessionId,
            userId: ctx.user?.id,
          });
          return { success: true, briefingId, sessionId };
        } catch (error) {
          logError(error, {
            operation: 'dailyBriefing',
            userId: ctx.user?.id,
            sessionId: input?.sessionId,
          });
          throw new Error('Failed to generate briefing');
        }
      }),

    // Refresh existing briefing with latest data
    refreshBriefing: protectedProcedure
      .input(z.object({ briefingId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        try {
          // For now, generate a new briefing
          // Full implementation would update in place
          const sessionId = `refresh-${input.briefingId}`;
          const newBriefingId = await generateDailyBriefing(sessionId);

          logger.info('Briefing refresh completed', {
            oldBriefingId: input.briefingId,
            newBriefingId,
            userId: ctx.user?.id,
          });

          return { success: true, briefingId: newBriefingId };
        } catch (error) {
          logError(error, {
            operation: 'refreshBriefing',
            briefingId: input.briefingId,
            userId: ctx.user?.id,
          });
          throw new Error('Failed to refresh briefing');
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
