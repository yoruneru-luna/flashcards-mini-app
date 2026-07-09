import cors from "@fastify/cors";
import sensible from "@fastify/sensible";
import Fastify from "fastify";
import { env } from "./config/env.js";
import { registerAuthRoutes } from "./modules/auth/auth.routes.js";
import { registerDeckRoutes } from "./modules/decks/decks.routes.js";
import { registerReviewRoutes } from "./modules/reviews/reviews.routes.js";

const app = Fastify({ logger: true });

await app.register(cors, { origin: env.webOrigin, credentials: true });
await app.register(sensible);

app.get("/health", async () => ({ ok: true }));
await app.register(registerAuthRoutes, { prefix: "/api" });
await app.register(registerDeckRoutes, { prefix: "/api" });
await app.register(registerReviewRoutes, { prefix: "/api" });

await app.listen({ port: env.apiPort, host: "0.0.0.0" });
