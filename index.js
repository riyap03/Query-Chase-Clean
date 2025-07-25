import express from "express";
import cors from "cors";
import multer from "multer";
import fs from "fs";
import pdf from "pdf-extraction"; // Replacing pdf-parse with pdf-extraction
import dotenv from "dotenv";
import OpenAI from "openai";
import axios from "axios";

dotenv.config();

const app = express();
app.use(
  cors({
    origin: "http://localhost:5173",
    methods: "GET,POST",
    allowedHeaders: "Content-Type",
  })
);
app.use(express.json({ limit: "50mb" }));

const PORT = process.env.PORT || 8000;

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
    const pdfData = await pdf(pdfBuffer); // Use pdf-extraction
    fs.unlinkSync(req.file.path); // Remove temp file

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
// 2. HACKRX RUN
// ===================
app.post("/api/v1/hackrx/run", async (req, res) => {
  try {
    const { documents, questions } = req.body;

    if (!documents || !Array.isArray(questions)) {
      return res.status(400).json({ error: "Invalid request format" });
    }

    // 1. Download PDF from the given URL
    console.log("Downloading PDF...");
    const response = await axios.get(documents, { responseType: "arraybuffer" });
    const pdfBuffer = Buffer.from(response.data);

    // 2. Extract text from PDF
    console.log("Extracting text from PDF...");
    const pdfData = await pdf(pdfBuffer);
    const pdfText = pdfData.text;

    // 3. Create a prompt for the AI model
    const prompt = `
    You are given a policy document and a list of questions.
    Document:
    ${pdfText}

    Questions:
    ${questions.map((q, i) => `${i + 1}. ${q}`).join("\n")}

    Provide clear and concise answers for each question.
    `;

    // 4. Query OpenAI
    console.log("Querying OpenAI...");
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
    });

    const answersText = completion.choices[0].message.content;

    res.json({ answers: answersText.split("\n").filter(a => a.trim() !== "") });
  } catch (err) {
    console.error("HackRX Run Error:", err);
    res.status(500).json({ error: "Failed to process document" });
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
  console.log(`🚀 Server running at http://localhost:${PORT}/api/v1`);
});









