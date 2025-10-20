/*
  Kori — Database Seed
  File: apps/api/prisma/seed.ts
  Stable v0.1 — 2025-10-20
  Purpose: Idempotent seed to bootstrap a single AdminUser and a sample Client.
  Usage (Windows/PowerShell):
    cd E:\Applications\Kori_web\apps\api
    pnpm add argon2
    pnpm add -D tsx
    npx tsx prisma/seed.ts

  Security:
    - Reads ADMIN_EMAIL and ADMIN_PASSWORD from environment (.env).
    - Rejects empty/weak passwords; does not echo secrets.
    - Uses Argon2id for hashing.
*/

import { PrismaClient } from "@prisma/client";
import argon2 from "argon2";

const prisma = new PrismaClient();

function env(name: string, fallback?: string): string | undefined {
  const val = process.env[name] ?? fallback;
  return (typeof val === "string" ? val.trim() : undefined) || undefined;
}

function isStrongPassword(pw: string): boolean {
  // Minimal strength: 10+ chars, includes 3 of: lower/upper/digit/symbol
  if (pw.length < 10) return false;
  const lower = /[a-z]/.test(pw);
  const upper = /[A-Z]/.test(pw);
  const digit = /\d/.test(pw);
  const symbol = /[^\w\s]/.test(pw);
  const score = [lower, upper, digit, symbol].filter(Boolean).length;
  return score >= 3;
}

async function ensureAdmin() {
  const email = env("ADMIN_EMAIL");
  const password = env("ADMIN_PASSWORD");

  if (!email || !password) {
    throw new Error(
      "ADMIN_EMAIL and ADMIN_PASSWORD must be set in the environment (.env)."
    );
  }
  if (!isStrongPassword(password)) {
    throw new Error(
      "ADMIN_PASSWORD must be at least 10 chars and include 3 of: lower/upper/digit/symbol."
    );
  }

  const existing = await prisma.adminUser.findUnique({ where: { email } });
  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });

  if (existing) {
    // Update hash only if password looks different (we cannot verify reliably without compare)
    await prisma.adminUser.update({
      where: { id: existing.id },
      data: { passwordHash },
    });
    return { created: false, email };
  }

  await prisma.adminUser.create({
    data: {
      email,
      passwordHash,
    },
  });
  return { created: true, email };
}

async function ensureSampleClient() {
  try {
    await prisma.client.upsert({
      where: { id: "seed-sample-client" },
      update: {},
      create: {
        id: "seed-sample-client",
        name: "Sample Client",
        type: "company",
        email: "sample-client@example.test",
        phone: "+0 0000 000000",
      },
    });
  } catch (e) {
    // Fallback: unique by [name,email] could block if user already made their own
    // It's fine to ignore — seed remains idempotent.
  }
}

async function main() {
  console.log("[seed] Starting...");
  const admin = await ensureAdmin();
  await ensureSampleClient();
  console.log(
    admin.created
      ? `[seed] Admin user created: ${admin.email}`
      : `[seed] Admin user ready: ${admin.email} (password updated)`,
  );
  console.log("[seed] Done.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error("[seed] FAILED:", err.message || err);
    await prisma.$disconnect();
    process.exit(1);
  });
