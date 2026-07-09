import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../plugins/prisma.js";
import { readPlatformIdentity } from "../auth/platformIdentity.js";

const reviewInput = z.object({
  cardId: z.string(),
  mode: z.enum(["basic", "written", "audio"]).default("basic"),
  rating: z.enum(["again", "hard", "good", "easy"]),
  answer: z.string().optional().nullable()
});

async function currentUserId(headers: Record<string, unknown>) {
  const identity = readPlatformIdentity(headers);
  const account = await prisma.platformAccount.findUniqueOrThrow({
    where: { platform_platformUserId: { platform: identity.platform, platformUserId: identity.platformUserId } }
  });
  return account.userId;
}

export async function registerReviewRoutes(app: FastifyInstance) {
  app.post("/reviews", async (request, reply) => {
    const userId = await currentUserId(request.headers);
    const input = reviewInput.parse(request.body);
    await prisma.card.findFirstOrThrow({ where: { id: input.cardId, userId } });

    const log = await prisma.reviewLog.create({
      data: { userId, cardId: input.cardId, mode: input.mode, rating: input.rating, answer: input.answer }
    });

    return reply.code(201).send(log);
  });
}
