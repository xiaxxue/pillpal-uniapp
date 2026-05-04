-- 启用 pgvector 扩展
CREATE EXTENSION IF NOT EXISTS vector;

-- 知识库文档表
CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text NOT NULL,
  content     text NOT NULL,
  category    text NOT NULL CHECK (category IN ('drug_info','interaction','guideline','faq')),
  drug_names  text[] DEFAULT '{}',
  embedding   vector(1536),
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_embedding
  ON knowledge_chunks USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS idx_knowledge_drug_names
  ON knowledge_chunks USING gin (drug_names);

-- 向量检索函数
CREATE OR REPLACE FUNCTION match_knowledge(
  query_embedding vector(1536),
  match_count     int DEFAULT 3,
  filter_drugs    text[] DEFAULT NULL,
  min_similarity  float DEFAULT 0.65
)
RETURNS TABLE(id uuid, title text, content text, category text, similarity float)
LANGUAGE sql STABLE AS $$
  SELECT id, title, content, category,
    1 - (embedding <=> query_embedding) AS similarity
  FROM knowledge_chunks
  WHERE
    embedding IS NOT NULL
    AND (filter_drugs IS NULL OR drug_names && filter_drugs)
    AND 1 - (embedding <=> query_embedding) >= min_similarity
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;

ALTER TABLE knowledge_chunks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read knowledge"
  ON knowledge_chunks FOR SELECT
  USING (true);
