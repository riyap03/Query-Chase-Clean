require("dotenv").config();
const { Pinecone } = require("@pinecone-database/pinecone");

async function testPinecone() {
  try {
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });

    // List all indexes
    const indexes = await pinecone.listIndexes();
    console.log("Available Pinecone indexes:", indexes);

    // Access your specific index
    const index = pinecone.index(process.env.PINECONE_INDEX_NAME);
    console.log(`Connected to index: ${process.env.PINECONE_INDEX_NAME}`);

  } catch (error) {
    console.error("Error testing Pinecone:", error);
  }
}

testPinecone();
