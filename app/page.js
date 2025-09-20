"use client";
import { useState, useRef } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";

function PDFChatInterface() {
  const [schemaJson, setSchemaJson] = useState(JSON.stringify({ company_name: "",email:"",address:"",phone_number:"",date:"" }, null, 2));
  const [description, setDescription] = useState(""); // structured markdown
  const [outputJson, setOutputJson] = useState(null); // JSON extracted using schema
  const [inputPrompt, setInputPrompt] = useState(""); // user-entered prompt
  const [suggestedPrompt, setSuggestedPrompt] = useState(null);
  const [documentId, setDocumentId] = useState(null); // ✅ NEW: track document_id
  const [pdfUrl, setPdfUrl] = useState(null);
  const [loading, setLoading] = useState(false);

  const fileInputRef = useRef(null);
  const uploadedFile = useRef(null);

  // File upload
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      uploadedFile.current = file;
      if (file.type === "application/pdf") {
        const url = URL.createObjectURL(file);
        setPdfUrl(url);
      }
    }
  };

  // Process file
  const handleProcessFile = async () => {
    if (!uploadedFile.current) {
      alert("❌ Please upload a file first.");
      return;
    }
    if (!schemaJson.trim()) {
      alert("❌ Please provide schema JSON in the textarea.");
      return;
    }

    try {
      setLoading(true);
      setDescription("⏳ Processing file...");
      setOutputJson(null);

      const formData = new FormData();
      formData.append("file", uploadedFile.current);
      formData.append("schema_json", schemaJson);

      const response = await axios.post(
        "http://localhost:8000/process-document/",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      if (response.data.status === "success") {
        setDescription(response.data.structured_markdown);
        setOutputJson(response.data.generated_json);

        // ✅ Save document_id from backend
        setDocumentId(response.data.document_id);

        // Get suggested prompt
        if (response.data.suggested_prompt) {
          setSuggestedPrompt(response.data.suggested_prompt);
        }
      } else {
        setDescription("❌ Error: " + response.data.message);
      }
    } catch (error) {
      setDescription("❌ API call failed: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Try prompt
  const handleTryPrompt = async () => {
    if (!inputPrompt.trim() || !documentId) return;
    try {
      const res = await axios.post("http://localhost:8000/try-prompt/", {
        document: description, // ✅ send doc id
        user_prompt: inputPrompt,
        schema_json: schemaJson,
      });
      setOutputJson(res.data.generated_json);
    } catch (err) {
      console.error("Try prompt failed", err);
    }
  };

  // Save prompt
  const handleSavePrompt = async () => {
    if (!inputPrompt.trim() || !documentId) return;
    try {
      await axios.post("http://localhost:8000/save-prompt/", {
        document_id: documentId, // ✅ send doc id
        user_prompt: inputPrompt,
      });
      setSuggestedPrompt(inputPrompt);
      alert("✅ Prompt saved!");
    } catch (err) {
      alert("❌ Failed to save prompt: " + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div>
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            PDF Intelligence Platform
          </h1>
          <p className="text-gray-600">
            Upload, analyze, and extract structured data from documents
          </p>
        </div>

        {/* Schema JSON Input */}
        <div className="mb-3 p-6 bg-white rounded-2xl shadow-lg">
          <textarea
            value={schemaJson}
            onChange={(e) => setSchemaJson(e.target.value)}
            placeholder='Enter schema JSON (e.g., {"order_id": "", "customer_name": ""})'
            className="w-full px-4 py-3 border text-black border-gray-300 rounded-xl h-24"
          />
          <div className="w-full flex justify-center">
            <button
              onClick={handleProcessFile}
              disabled={loading}
              className={`px-6 mt-4 py-3 ${
                loading ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
              } text-white rounded-xl`}
            >
              {loading ? "Processing..." : "Process File"}
            </button>
          </div>
        </div>

        {/* Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* PDF Preview */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Document Preview</h2>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".pdf,.doc,.docx,.xls,.xlsx"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="mb-3 px-4 py-2 bg-blue-500 text-white rounded-lg"
            >
              Upload File
            </button>
            {pdfUrl ? (
              <iframe src={pdfUrl} className="w-full h-96" frameBorder="0" />
            ) : (
              <p className="text-gray-500">No file uploaded</p>
            )}
          </div>

          {/* Description */}
          <div className="bg-white rounded-2xl shadow-lg p-6 col-span-2">
            <h2 className="text-xl font-semibold mb-4">Description</h2>
            <div className="bg-gray-50 rounded-xl p-4 h-96 overflow-y-auto text-sm text-gray-800">
              {description ? (
                <ReactMarkdown>{description}</ReactMarkdown>
              ) : (
                "No markdown generated yet"
              )}
            </div>
          </div>

          {/* Chat */}
          <div className="bg-white rounded-2xl shadow-lg p-6 flex flex-col">
            <h2 className="text-xl font-semibold mb-4">Sub Prompt Window</h2>
            {suggestedPrompt ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-700">
                  Sub Prompt used: <em>{suggestedPrompt}</em>
                </p>
                <textarea
                  value={inputPrompt}
                  onChange={(e) => setInputPrompt(e.target.value)}
                  placeholder="Modify or add your own prompt..."
                  className="w-full border p-2 rounded-lg"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleTryPrompt}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg"
                  >
                    Try
                  </button>
                  <button
                    onClick={handleSavePrompt}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg"
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <textarea
                  value={inputPrompt}
                  onChange={(e) => setInputPrompt(e.target.value)}
                  placeholder="Enter a new prompt..."
                  className="w-full border p-2 rounded-lg"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleTryPrompt}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg"
                  >
                    Try
                  </button>
                  <button
                    onClick={handleSavePrompt}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg"
                  >
                    Save
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Output JSON */}
          <div className="bg-white rounded-2xl shadow-lg p-6 col-span-4">
            <h2 className="text-xl font-semibold mb-4">Output JSON</h2>
            <div className="bg-gray-100 rounded-xl p-4 h-96 overflow-y-auto">
              <pre className="text-gray-800 whitespace-pre-wrap text-sm">
                {outputJson
                  ? JSON.stringify(outputJson, null, 2)
                  : "No JSON generated yet"}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return <PDFChatInterface />;
}
