import axios from "axios";
import fs from "fs";
import PDFParser from "pdf2json";

const pdfUrl = "https://hackrx.blob.core.windows.net/assets/policy.pdf?...";

(async () => {
  try {
    const response = await axios.get(pdfUrl, { responseType: "arraybuffer" });
    fs.writeFileSync("temp.pdf", response.data);

    const pdfParser = new PDFParser();
    pdfParser.on("pdfParser_dataReady", pdfData => {
      const rawText = pdfData.Pages.map(page =>
        page.Texts.map(textObj => decodeURIComponent(textObj.R[0].T)).join(" ")
      ).join("\n");
      console.log("PDF Extracted Text (first 300 chars):");
      console.log(rawText.substring(0, 300));
    });

    pdfParser.on("pdfParser_dataError", errData => {
      console.error("PDF parse error:", errData.parserError);
    });

    pdfParser.loadPDF("temp.pdf");
  } catch (err) {
    console.error("Error downloading or parsing PDF:", err);
  }
})();

