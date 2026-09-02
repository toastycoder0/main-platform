import { env } from "@/config/env";
import { auth } from "@/shared/auth";
import { logger } from "@/shared/logger";

async function seed() {
  const newUser = await auth.api.createUser({
    body: {
      email: env.ADMIN_SEED_EMAIL,
      password: env.ADMIN_SEED_PASSWORD,
      role: "admin",
      name: "John",
      data: { lastName: "Doe" },
    },
  });

  logger.info(newUser);
}

seed()
  .then(() => {
    logger.info("Admin user seeded successfully");
    process.exit(0);
  })
  .catch((error) => {
    logger.error("Seeding process failed:", error);
    process.exit(1);
  });
