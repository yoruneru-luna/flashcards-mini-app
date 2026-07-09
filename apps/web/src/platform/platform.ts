export type PlatformContext = {
  platform: "telegram" | "vk" | "dev";
  userId?: string;
  username?: string;
};

export function detectPlatform(): PlatformContext {
  const telegram = (window as unknown as { Telegram?: { WebApp?: unknown } }).Telegram?.WebApp;
  if (telegram) return { platform: "telegram" };

  const search = new URLSearchParams(window.location.search);
  if (search.has("vk_user_id")) return { platform: "vk", userId: search.get("vk_user_id") ?? undefined };

  return { platform: "dev", userId: "dev-user-1", username: "dev" };
}

export function platformHeaders() {
  const context = detectPlatform();
  return {
    "x-platform": context.platform,
    "x-platform-user-id": context.userId ?? "dev-user-1",
    "x-platform-username": context.username ?? ""
  };
}
