import { env } from "@/config/env";
import { auth } from "@/shared/auth";

async function seed() {
  const { AUTH_EMAIL = "", AUTH_PASSWORD = "" } = env;
}

await seed();

