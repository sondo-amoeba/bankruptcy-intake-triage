import { execSync } from "node:child_process";

const url = process.env.POSTGRES_URL?.trim() || process.env.DATABASE_URL?.trim();

if (!url) {
  console.warn("Skipping drizzle push: POSTGRES_URL / DATABASE_URL not set");
  process.exit(0);
}

execSync("drizzle-kit push", { stdio: "inherit" });
