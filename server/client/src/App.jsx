import { useState } from "react";
import axios from "axios";
import "./App.css";

function App() {
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState("");
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const [documentText, setDocumentText] = useState("");

  const API_BASE = "http://localhost:8000/api/v1"; // Backend URL

  // Handle file selection
  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setFileName(e.target.files[0]?.name || "");
    setUploadStatus("");
    setDocumentText("");
  };

  // Upload file and extract text
  const handleUpload = async () => {
    if (!file) {
      setUploadStatus("⚠️ Please select a document first!");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("file", file);

      setLoading(true);
      setUploadStatus("⏳ Uploading...");
      const res = await axios.post(`${API_BASE}/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setDocumentText(res.data.text);
      setUploadStatus("✅ Document uploaded and text extracted!");
    } catch (error) {
      console.error("Upload error:", error);
      setUploadStatus("❌ Failed to upload document.");
    } finally {
      setLoading(false);
    }
  };

  // Ask AI
  const handleQuery = async () => {
    if (!query.trim()) {
      setResponse("⚠️ Please enter a question!");
      return;
    }

    if (!documentText) {
      setResponse("⚠️ Please upload a document first!");
      return;
    }

    try {
      setLoading(true);
      setResponse("🤔 Thinking...");
      const res = await axios.post(`${API_BASE}/hackrx/run`, {
        context: documentText,  // must match backend
        query: query,           // must match backend
      });

      setResponse(res.data.answer || "No response.");
    } catch (error) {
      console.error("Query error:", error.response?.data || error.message);
      setResponse("❌ Error: Failed to fetch AI response.");
    } finally {
      setLoading(false);
    }
  };

  // Clear chat
  const clearChat = () => {
    setResponse("");
    setQuery("");
  };

  return (
    <div className="app-container">
      <h1 className="title">✨ Query Chase AI ✨</h1>

      <div className="upload-section">
        <label className="file-label">
          {fileName || "📂 Choose a Document"}
          <input
            type="file"
            accept=".pdf,.docx,.eml"
            onChange={handleFileChange}
            style={{ display: "none" }}
          />
        </label>
        <button onClick={handleUpload} disabled={loading}>
          {loading ? "Uploading..." : "Upload"}
        </button>
      </div>

      <p className="upload-status">{uploadStatus}</p>

      <div className="query-section">
        <textarea
          className="query-box"
          placeholder="Ask your question..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          rows="4"
        />
      </div>

      <div className="button-group">
        <button onClick={handleQuery} disabled={loading || !documentText || !query.trim()}>
          {loading ? "Thinking..." : "Ask AI"}
        </button>
        <button className="clear-btn" onClick={clearChat}>
          Clear Chat
        </button>
      </div>

      <div className="response-section">
        <h3>Response:</h3>
        <div className="response-box">{response || "No response yet."}</div>
      </div>
    </div>
  );
}

export default App;
