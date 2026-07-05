-- ─── Full-text search on Notes ────────────────────────────────────────
-- Run AFTER `prisma db push` (or include in init migration).
-- This is a manually-applied SQL patch; safe to re-run (idempotent via IF NOT EXISTS).

-- 1. Generated column: tsvector from title (weight A) + content (weight B)
ALTER TABLE "Note"
  ADD COLUMN IF NOT EXISTS "search_vector" tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('spanish', coalesce("title", '')), 'A') ||
    setweight(to_tsvector('spanish', coalesce("content", '')), 'B')
  ) STORED;

-- 2. GIN index for fast tsvector queries
CREATE INDEX IF NOT EXISTS "Note_search_vector_idx"
  ON "Note" USING GIN ("search_vector");

-- 3. Websearch-style query helper (optional). Use:
--    SELECT * FROM "Note"
--    WHERE "search_vector" @@ websearch_to_tsquery('spanish', $1)
--    ORDER BY ts_rank("search_vector", websearch_to_tsquery('spanish', $1)) DESC;
