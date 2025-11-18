import { db, schema } from "./base";
import { eq } from "drizzle-orm";
import { ENV } from "../_core/env";
import { logger } from "../_core/logger";

export const userRepository = {
  async upsert(user: schema.InsertUser): Promise<void> {
    if (!user.openId) throw new Error("User openId is required for upsert");

    const values: schema.InsertUser = {
      openId: user.openId,
      name: user.name ?? null,
      email: user.email ?? null,
      loginMethod: user.loginMethod ?? null,
      lastSignedIn: user.lastSignedIn ?? new Date(),
      role: user.role ?? (user.openId === ENV.ownerOpenId ? 'admin' : 'user'),
    };

    const updateSet: Partial<schema.InsertUser> = { ...values };
    delete updateSet.openId;

    try {
      await db.insert(schema.users).values(values).onDuplicateKeyUpdate({
        set: updateSet,
      });
    } catch (error) {
      logger.error("[Database] Failed to upsert user", { error });
      throw error;
    }
  },

  async getByOpenId(openId: string) {
    return await db.query.users.findFirst({
      where: eq(schema.users.openId, openId),
    });
  }
};
