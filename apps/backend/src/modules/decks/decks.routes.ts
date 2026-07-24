import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../plugins/prisma.js";
import { readPlatformIdentity } from "../auth/platformIdentity.js";

const deckInput = z.object({
  title: z.string().min(1).max(120),
  description: z.string().max(500).optional().nullable(),
  categoryId: z.string().optional().nullable(),
  language: z.enum(["none", "english", "spanish"]).default("none"),
  fsrsEnabled: z.boolean().default(false)
});

const deckUpdateInput = deckInput.partial();

const cardInput = z.object({
  front: z.string().min(1).max(2000),
  back: z.string().min(1).max(2000),
  example: z.string().max(2000).optional().nullable(),
  hint: z.string().max(1000).optional().nullable(),
  transcription: z.string().max(300).optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
  tags: z.array(z.string().min(1).max(50)).default([])
});

const cardUpdateInput = cardInput.partial();

const categoryInput = z.object({
  title: z.string().min(1).max(80)
});

function serializeCard(card: {
  id: string;
  deckId: string;
  front: string;
  back: string;
  example: string | null;
  hint: string | null;
  transcription: string | null;
  imageUrl: string | null;
  tags: { title: string }[];
  fsrsState?: { dueAt: Date | null; reps: number; state: string } | null;
}) {
  return {
    id: card.id,
    deckId: card.deckId,
    front: card.front,
    back: card.back,
    example: card.example,
    hint: card.hint,
    transcription: card.transcription,
    imageUrl: card.imageUrl,
    dueAt: card.fsrsState?.dueAt?.toISOString() ?? null,
    reps: card.fsrsState?.reps ?? 0,
    reviewState: card.fsrsState?.state ?? "new",
    tags: card.tags.map((tag) => tag.title)
  };
}

async function currentUserId(headers: Record<string, unknown>) {
  const identity = readPlatformIdentity(headers);
  const account = await prisma.platformAccount.findUniqueOrThrow({
    where: { platform_platformUserId: { platform: identity.platform, platformUserId: identity.platformUserId } }
  });
  return account.userId;
}

export async function registerDeckRoutes(app: FastifyInstance) {
  app.get("/categories", async (request) => {
    const userId = await currentUserId(request.headers);
    const categories = await prisma.category.findMany({
      where: { userId },
      orderBy: { title: "asc" },
      include: { _count: { select: { decks: true } } }
    });

    return categories.map((category) => ({
      id: category.id,
      title: category.title,
      decksCount: category._count.decks
    }));
  });

  app.post("/categories", async (request, reply) => {
    const userId = await currentUserId(request.headers);
    const input = categoryInput.parse(request.body);
    const category = await prisma.category.create({ data: { userId, title: input.title } });

    return reply.code(201).send({ id: category.id, title: category.title, decksCount: 0 });
  });

  app.get("/decks", async (request) => {
    const userId = await currentUserId(request.headers);
    const decks = await prisma.deck.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      include: { category: true, _count: { select: { cards: true } } }
    });

    return decks.map((deck) => ({
      id: deck.id,
      title: deck.title,
      description: deck.description,
      categoryId: deck.categoryId,
      categoryTitle: deck.category?.title ?? null,
      cardsCount: deck._count.cards,
      fsrsEnabled: deck.fsrsEnabled
    }));
  });

  app.post("/decks", async (request, reply) => {
    const userId = await currentUserId(request.headers);
    const input = deckInput.parse(request.body);
    if (input.categoryId) await prisma.category.findFirstOrThrow({ where: { id: input.categoryId, userId } });

    const deck = await prisma.deck.create({ data: { ...input, userId } });
    return reply.code(201).send({ ...deck, categoryTitle: null, cardsCount: 0 });
  });

  app.patch("/decks/:deckId", async (request) => {
    const userId = await currentUserId(request.headers);
    const params = z.object({ deckId: z.string() }).parse(request.params);
    const input = deckUpdateInput.parse(request.body);

    await prisma.deck.findFirstOrThrow({ where: { id: params.deckId, userId } });
    if (input.categoryId) await prisma.category.findFirstOrThrow({ where: { id: input.categoryId, userId } });

    const deck = await prisma.deck.update({
      where: { id: params.deckId },
      data: input,
      include: { category: true, _count: { select: { cards: true } } }
    });

    return {
      id: deck.id,
      title: deck.title,
      description: deck.description,
      categoryId: deck.categoryId,
      categoryTitle: deck.category?.title ?? null,
      cardsCount: deck._count.cards,
      fsrsEnabled: deck.fsrsEnabled
    };
  });

  app.delete("/decks/:deckId", async (request) => {
    const userId = await currentUserId(request.headers);
    const params = z.object({ deckId: z.string() }).parse(request.params);
    await prisma.deck.deleteMany({ where: { id: params.deckId, userId } });

    return { ok: true };
  });

  app.get("/decks/:deckId/cards", async (request) => {
    const userId = await currentUserId(request.headers);
    const params = z.object({ deckId: z.string() }).parse(request.params);
    const cards = await prisma.card.findMany({
      where: { userId, deckId: params.deckId },
      orderBy: { createdAt: "desc" },
      include: { tags: true, fsrsState: true }
    });

    return cards.map(serializeCard);
  });

  app.post("/decks/:deckId/cards", async (request, reply) => {
    const userId = await currentUserId(request.headers);
    const params = z.object({ deckId: z.string() }).parse(request.params);
    const input = cardInput.parse(request.body);

    await prisma.deck.findFirstOrThrow({ where: { id: params.deckId, userId } });

    const card = await prisma.card.create({
      data: {
        userId,
        deckId: params.deckId,
        front: input.front,
        back: input.back,
        example: input.example,
        hint: input.hint,
        transcription: input.transcription,
        imageUrl: input.imageUrl,
        fsrsState: { create: { dueAt: new Date() } },
        tags: { create: input.tags.map((title) => ({ title })) }
      },
      include: { tags: true, fsrsState: true }
    });

    return reply.code(201).send(serializeCard(card));
  });

  app.patch("/cards/:cardId", async (request) => {
    const userId = await currentUserId(request.headers);
    const params = z.object({ cardId: z.string() }).parse(request.params);
    const input = cardUpdateInput.parse(request.body);

    await prisma.card.findFirstOrThrow({ where: { id: params.cardId, userId } });

    const card = await prisma.$transaction(async (tx) => {
      if (input.tags) {
        await tx.cardTag.deleteMany({ where: { cardId: params.cardId } });
      }

      return tx.card.update({
        where: { id: params.cardId },
        data: {
          front: input.front,
          back: input.back,
          example: input.example,
          hint: input.hint,
          transcription: input.transcription,
          imageUrl: input.imageUrl,
          tags: input.tags ? { create: input.tags.map((title) => ({ title })) } : undefined
        },
        include: { tags: true }
      });
    });

    const cardWithState = await prisma.card.findUniqueOrThrow({
      where: { id: card.id },
      include: { tags: true, fsrsState: true }
    });

    return serializeCard(cardWithState);
  });

  app.delete("/cards/:cardId", async (request) => {
    const userId = await currentUserId(request.headers);
    const params = z.object({ cardId: z.string() }).parse(request.params);
    await prisma.card.deleteMany({ where: { id: params.cardId, userId } });

    return { ok: true };
  });
}
