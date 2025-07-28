import express from "express";
import cors from "cors";
import multer from "multer";
import fs from "fs";
import pdf from "pdf-extraction";
import PDFParser from "pdf2json";
import dotenv from "dotenv";
import OpenAI from "openai";
import axios from "axios";

dotenv.config();

const app = express();
app.use(
  cors({
    origin: "*", // Allow all origins for now (fix if needed)
    methods: "GET,POST",
    allowedHeaders: "Content-Type",
  })
);
app.use(express.json({ limit: "50mb" }));

const PORT = process.env.PORT || 8000;
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Multer Setup
const upload = multer({ dest: "uploads/" });
async function extractWithPdfExtraction(filePath) {
  const dataBuffer = fs.readFileSync(filePath);
  return pdf(dataBuffer);
}
function extractWithPdf2json(filePath) {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser();
    pdfParser.on("pdfParser_dataError", (err) => reject(err));
    pdfParser.on("pdfParser_dataReady", (pdfData) => {
      const text = pdfData.Pages.map(page =>
        page.Texts.map(t => decodeURIComponent(t.R[0].T)).join(" ")
      ).join("\n");
      resolve({ text });
    });
    pdfParser.loadPDF(filePath);
  });
}


// =======================
// 1. UPLOAD PDF
// =======================
app.post("/api/v1/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const filePath = req.file.path;
    const pdfBuffer = fs.readFileSync(filePath);

    let text = "";
    try {
      // Try pdf-extraction
      const pdfData = await pdf(pdfBuffer);
      text = pdfData.text.trim();
      if (!text) throw new Error("Empty text from pdf-extraction");
    } catch (err) {
      console.warn("pdf-extraction failed, switching to pdf2json:", err.message);
      text = await extractWithPdf2json(filePath);
    }

    // Clean up uploaded file
    fs.unlinkSync(filePath);

    return res.json({
      message: "File uploaded successfully",
      text: text || "No text found in PDF",
    });
  } catch (err) {
    console.error("Upload error:", err);
    return res.status(500).json({ error: "Failed to process PDF" });
  }
});

// =======================
// 2. HACKRX RUN
// =======================
app.post("/api/v1/hackrx/run", async (req, res) => {
  try {
    const { documents, questions } = req.body;

    if (!documents || !Array.isArray(questions)) {
      return res.status(400).json({ error: "Invalid request format" });
    }

    // Download PDF
    console.log("Downloading PDF...");
    let pdfBuffer;
    try {
      const response = await axios.get(documents, { responseType: "arraybuffer" });
      pdfBuffer = Buffer.from(response.data);
    } catch (error) {
      return res.status(400).json({ error: "Unable to download PDF. Check URL." });
    }

    // Extract Text
    console.log("Extracting text...");
    let pdfText = "";
    try {
      const pdfData = await pdf(pdfBuffer);
      pdfText = pdfData.text || "";
    } catch (err) {
      console.error("PDF extraction failed:", err);
      return res.status(500).json({ error: "Failed to extract PDF text" });
    }

    // Trim large text (OpenAI token limits)
    if (pdfText.length > 5000) {
      pdfText = pdfText.slice(0, 5000) + "...[Truncated]";
    }

    // Prepare Prompt
    const prompt = `
You are given a document and some questions. Read the document and answer each question briefly.
Document:
${pdfText}

Questions:
${questions.map((q, i) => `${i + 1}. ${q}`).join("\n")}

Answer:
`;

    // Query OpenAI
    console.log("Querying OpenAI...");
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
    });

    const answersText = completion.choices[0].message.content;
    res.json({ answers: answersText.split("\n").filter(a => a.trim()) });
  } catch (err) {
    console.error("HackRX Run Error:", err);
    res.status(500).json({ error: "Failed to process document" });
  }
});

// =======================
// 3. TEST ROUTE
// =======================
app.get("/api/v1", (req, res) => {
  res.json({ message: "Welcome to QueryChase API v1 🚀" });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}/api/v1`);
 
});




