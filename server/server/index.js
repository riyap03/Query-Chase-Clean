import express from "express";
import cors from "cors";
import multer from "multer";
import fs from "fs";
import pdfParse from "pdf-parse/lib/pdf-parse.js";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
app.use(cors({
  origin: "http://localhost:5173",
  methods: "GET,POST",
  allowedHeaders: "Content-Type",
}));
app.use(express.json({ limit: "50mb" }));

const PORT = process.env.PORT || 8000;

// Check OpenAI API key
if (!process.env.OPENAI_API_KEY) {
  console.error("❌ OPENAI_API_KEY is missing in .env file!");
  process.exit(1);
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ===================
// Multer for File Uploads
// ===================
const upload = multer({ dest: "uploads/" });

// ===================
// 1. UPLOAD PDF
// ===================
app.post("/api/v1/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const pdfBuffer = fs.readFileSync(req.file.path);
    const pdfData = await pdfParse(pdfBuffer);

    fs.unlinkSync(req.file.path); // remove temp file

    return res.json({
      message: "File uploaded successfully",
      text: pdfData.text,
    });
  } catch (err) {
    console.error("Upload error:", err);
    return res.status(500).json({ error: "Failed to process PDF" });
  }
});

// ===================
// 2. ASK QUERY
// ===================
app.post("/api/v1/hackrx/run", async (req, res) => {
  try {
    const { documents, questions } = req.body;
    if (!documents || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: "Both 'documents' and 'questions' are required." });
    }

    // Just sending the URL as "context" (OpenAI can't read PDFs directly!)
    const context = `Document URL: ${documents}`;
    const prompt = `
      Context: ${context}
      Questions: ${questions.join(", ")}
      Answer concisely using ONLY the context above.
    `;

    console.log("🔍 Sending prompt to OpenAI...");

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 256,
      temperature: 0.2,
    });

    const answer = completion.choices[0]?.message?.content || "No answer generated.";
    res.json({ answer });
  } catch (err) {
    console.error("hackrx/run error:", err.response?.data || err.message || err);
    return res.status(500).json({
      error: "Failed to generate answer",
      details: err.response?.data || err.message,
    });
  }
});

// ===================
// 3. TEST ROUTE
// ===================
app.get("/api/v1/test", (req, res) => {
  res.json({ status: "Server is running with OpenAI API" });
});

// ===================
// START SERVER
// ===================
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
