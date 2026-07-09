export const env = {
  apiPort: Number(process.env.API_PORT ?? 4000),
  webOrigin: process.env.WEB_ORIGIN ?? "http://localhost:5173",
  devPlatformUserId: process.env.DEV_PLATFORM_USER_ID ?? "dev-user-1"
};
