require("dotenv").config();
const { Pinecone } = require("@pinecone-database/pinecone");

async function testInsertAndQuery() {
  try {
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });

    const index = pinecone.index(process.env.PINECONE_INDEX_NAME);
    console.log(`Connected to index: ${process.env.PINECONE_INDEX_NAME}`);

    // Insert a test vector
    const testVector = {
      id: "test-vector-1",
      values: Array(768).fill(0.5), // 768-dimensional vector
      metadata: { text: "Hello from Query-Chase AI!" },
    };

    await index.upsert([testVector]);
    console.log("✅ Test vector inserted!");

    // Query the vector
    const queryResult = await index.query({
      vector: Array(768).fill(0.5),
      topK: 1,
      includeMetadata: true,
    });

    console.log("Query Result:", JSON.stringify(queryResult, null, 2));
  } catch (error) {
    console.error("Error testing Pinecone insert/query:", error);
  }
}

testInsertAndQuery();
