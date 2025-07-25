import { Pinecone } from "@pinecone-database/pinecone";
import dotenv from "dotenv";
dotenv.config();

const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const index = pinecone.Index(process.env.PINECONE_INDEX_NAME);

export async function upsertChunks(chunks, embedFn) {
  const vectors = await Promise.all(
    chunks.map(async (text, i) => ({
      id: `chunk-${i}-${Date.now()}`,
      values: await embedFn(text),
      metadata: { text }
    }))
  );

  await index.upsert({ upsertRequest: { vectors } });
}

export async function searchChunks(query, topK = 3, embedFn) {
  const vec = await embedFn(query);
  const result = await index.query({
    queryRequest: { vector: vec, topK, includeMetadata: true }
  });
  return result.matches.map(m => m.metadata.text);
}
