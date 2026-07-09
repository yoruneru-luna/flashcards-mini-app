import type { FastifyInstance } from "fastify";
import { prisma } from "../../plugins/prisma.js";
import { readPlatformIdentity } from "./platformIdentity.js";

export async function registerAuthRoutes(app: FastifyInstance) {
  app.get("/me", async (request) => {
    const identity = readPlatformIdentity(request.headers);

    const account = await prisma.platformAccount.upsert({
      where: {
        platform_platformUserId: {
          platform: identity.platform,
          platformUserId: identity.platformUserId
        }
      },
      update: {
        username: identity.username,
        firstName: identity.firstName,
        lastName: identity.lastName,
        rawProfile: identity.rawProfile === undefined ? undefined : (identity.rawProfile as object)
      },
      create: {
        platform: identity.platform,
        platformUserId: identity.platformUserId,
        username: identity.username,
        firstName: identity.firstName,
        lastName: identity.lastName,
        rawProfile: identity.rawProfile === undefined ? undefined : (identity.rawProfile as object),
        user: { create: {} }
      },
      include: { user: true }
    });

    return { id: account.user.id, email: account.user.email, platform: account.platform };
  });
}
