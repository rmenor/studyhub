#!/usr/bin/env node
/* StudyHub web entrypoint — Node-only, no system deps. */
const { spawnSync } = require("node:child_process");
const { Client } = require("pg");

function log(msg) {
  console.log(`[entrypoint] ${msg}`);
}

function envFlag(name, fallback) {
  const v = process.env[name];
  if (v === undefined || v === "") return fallback;
  return v;
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function parseDatabaseUrl(url) {
  const u = new URL(url);
  return {
    host: u.hostname,
    port: Number(u.port || 5432),
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.replace(/^\//, "") || "postgres",
  };
}

async function waitForDb() {
  const cfg = parseDatabaseUrl(process.env.DATABASE_URL);
  log(`Waiting for database at ${cfg.host}:${cfg.port} (db: ${cfg.database})...`);
  for (let i = 1; i <= 60; i++) {
    const c = new Client(cfg);
    try {
      await c.connect();
      await c.end();
      log("Database is up.");
      return;
    } catch (e) {
      if (i % 10 === 0) log(`  ...attempt ${i}/60 (${e.code || e.message})`);
      await sleep(1000);
    }
  }
  throw new Error("Database did not become reachable in time.");
}

async function applyFtsMigration() {
  const fs = require("node:fs/promises");
  const path = require("node:path");
  const file = path.join(process.cwd(), "prisma/migrations/manual/full_text_search.sql");
  try {
    const sql = await fs.readFile(file, "utf8");
    log("Applying full-text search migration...");
    const c = new Client(parseDatabaseUrl(process.env.DATABASE_URL));
    await c.connect();
    await c.query(sql);
    await c.end();
    log("FTS migration applied.");
  } catch (e) {
    if (e.code === "ENOENT") {
      log("No FTS migration file found; skipping.");
    } else {
      log(`FTS migration warning: ${e.message}`);
    }
  }
}

function runPrismaDbPush() {
  log("Running prisma db push...");
  const r = spawnSync("npx", ["prisma", "db", "push", "--skip-generate"], {
    stdio: "inherit",
    env: process.env,
  });
  if (r.status !== 0) {
    throw new Error(`prisma db push failed with exit code ${r.status}`);
  }
}

async function main() {
  await waitForDb();
  runPrismaDbPush();
  await applyFtsMigration();
  log("Starting Next.js...");
  const next = spawnSync("node", ["server.js"], {
    stdio: "inherit",
    env: process.env,
  });
  process.exit(next.status ?? 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
