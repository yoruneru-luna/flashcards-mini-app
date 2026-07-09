import { z } from "zod";
import { env } from "../../config/env.js";

const platformSchema = z.enum(["telegram", "vk", "dev"]);

export type PlatformIdentity = {
  platform: "telegram" | "vk" | "dev";
  platformUserId: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  rawProfile?: unknown;
};

export function readPlatformIdentity(headers: Record<string, unknown>): PlatformIdentity {
  const requestedPlatform = platformSchema.safeParse(headers["x-platform"]);

  if (!requestedPlatform.success || requestedPlatform.data === "dev") {
    return {
      platform: "dev",
      platformUserId: String(headers["x-dev-user-id"] ?? env.devPlatformUserId),
      username: "dev"
    };
  }

  return {
    platform: requestedPlatform.data,
    platformUserId: String(headers["x-platform-user-id"] ?? env.devPlatformUserId),
    username: typeof headers["x-platform-username"] === "string" ? headers["x-platform-username"] : undefined
  };
}
