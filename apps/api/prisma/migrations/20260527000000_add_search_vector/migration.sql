-- Add tsvector column for full-text search
ALTER TABLE "pages" ADD COLUMN "search_vector" tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content, ''))
  ) STORED;

-- GIN index for fast full-text queries
CREATE INDEX "pages_search_vector_idx" ON "pages" USING GIN ("search_vector");
