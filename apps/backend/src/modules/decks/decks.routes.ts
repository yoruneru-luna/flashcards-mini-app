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

const cardInput = z.object({
  front: z.string().min(1).max(2000),
  back: z.string().min(1).max(2000),
  example: z.string().max(2000).optional().nullable(),
  hint: z.string().max(1000).optional().nullable(),
  transcription: z.string().max(300).optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
  tags: z.array(z.string().min(1).max(50)).default([])
});

async function currentUserId(headers: Record<string, unknown>) {
  const identity = readPlatformIdentity(headers);
  const account = await prisma.platformAccount.findUniqueOrThrow({
    where: { platform_platformUserId: { platform: identity.platform, platformUserId: identity.platformUserId } }
  });
  return account.userId;
}

export async function registerDeckRoutes(app: FastifyInstance) {
  app.get("/decks", async (request) => {
    const userId = await currentUserId(request.headers);
    const decks = await prisma.deck.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      include: { _count: { select: { cards: true } } }
    });

    return decks.map((deck) => ({
      id: deck.id,
      title: deck.title,
      description: deck.description,
      cardsCount: deck._count.cards,
      fsrsEnabled: deck.fsrsEnabled
    }));
  });

  app.post("/decks", async (request, reply) => {
    const userId = await currentUserId(request.headers);
    const input = deckInput.parse(request.body);
    const deck = await prisma.deck.create({ data: { ...input, userId } });
    return reply.code(201).send({ ...deck, cardsCount: 0 });
  });

  app.get("/decks/:deckId/cards", async (request) => {
    const userId = await currentUserId(request.headers);
    const params = z.object({ deckId: z.string() }).parse(request.params);
    const cards = await prisma.card.findMany({
      where: { userId, deckId: params.deckId },
      orderBy: { createdAt: "desc" },
      include: { tags: true }
    });

    return cards.map((card) => ({
      id: card.id,
      deckId: card.deckId,
      front: card.front,
      back: card.back,
      example: card.example,
      hint: card.hint,
      transcription: card.transcription,
      imageUrl: card.imageUrl,
      tags: card.tags.map((tag) => tag.title)
    }));
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
        tags: { create: input.tags.map((title) => ({ title })) }
      },
      include: { tags: true }
    });

    return reply.code(201).send({
      id: card.id,
      deckId: card.deckId,
      front: card.front,
      back: card.back,
      example: card.example,
      hint: card.hint,
      transcription: card.transcription,
      imageUrl: card.imageUrl,
      tags: card.tags.map((tag) => tag.title)
    });
  });
}
