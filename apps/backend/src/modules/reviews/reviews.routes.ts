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

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function addMinutes(date: Date, minutes: number) {
  const next = new Date(date);
  next.setMinutes(next.getMinutes() + minutes);
  return next;
}

function nextReviewState(
  rating: "again" | "hard" | "good" | "easy",
  current?: { difficulty: number | null; scheduledDays: number; reps: number; lapses: number } | null
) {
  const now = new Date();
  const previousDays = Math.max(0, current?.scheduledDays ?? 0);
  const reps = (current?.reps ?? 0) + 1;
  const lapses = (current?.lapses ?? 0) + (rating === "again" ? 1 : 0);
  const difficultyBase = current?.difficulty ?? 5;

  const scheduledDays = rating === "again"
    ? 0
    : rating === "hard"
      ? Math.max(1, Math.ceil(Math.max(1, previousDays) * 1.2))
      : rating === "good"
        ? previousDays === 0 ? 1 : Math.ceil(previousDays * 2.5)
        : previousDays === 0 ? 4 : Math.ceil(previousDays * 3.5);

  const difficulty = Math.min(10, Math.max(1, difficultyBase + (rating === "again" ? 0.8 : rating === "hard" ? 0.3 : rating === "easy" ? -0.4 : -0.1)));

  return {
    dueAt: rating === "again" ? addMinutes(now, 10) : addDays(now, scheduledDays),
    stability: Math.max(0.1, scheduledDays || 0.1),
    difficulty,
    elapsedDays: previousDays,
    scheduledDays,
    reps,
    lapses,
    state: "review",
    lastReviewAt: now
  };
}

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
    const card = await prisma.card.findFirstOrThrow({
      where: { id: input.cardId, userId },
      include: { fsrsState: true }
    });
    const nextState = nextReviewState(input.rating, card.fsrsState);

    const [log, fsrsState] = await prisma.$transaction([
      prisma.reviewLog.create({
        data: { userId, cardId: input.cardId, mode: input.mode, rating: input.rating, answer: input.answer }
      }),
      prisma.fsrsState.upsert({
        where: { cardId: input.cardId },
        update: nextState,
        create: { cardId: input.cardId, ...nextState }
      })
    ]);

    return reply.code(201).send({
      ...log,
      nextDueAt: fsrsState.dueAt?.toISOString() ?? null,
      reps: fsrsState.reps
    });
  });
}
