import "dotenv/config";

function getEnv(key: string, required: boolean = false): string {
  const value = process.env[key];
  if (required && !value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value ?? "";
}

export const ENV = {
  appId: getEnv("VITE_APP_ID"),
  cookieSecret: getEnv("JWT_SECRET"),
  databaseUrl: getEnv("DATABASE_URL", true),
  oAuthServerUrl: getEnv("OAUTH_SERVER_URL"),
  ownerOpenId: getEnv("OWNER_OPEN_ID"),
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: getEnv("BUILT_IN_FORGE_API_URL"),
  forgeApiKey: getEnv("BUILT_IN_FORGE_API_KEY"),
};
