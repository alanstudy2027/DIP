"use client";
import { useState, useRef } from "react";
import axios from "axios";
import ReactMarkdown from 'react-markdown';
import { 
  Search, 
  X, 
  FileText, 
  AlertCircle, 
  FolderOpen,
  User,
  Calendar,
  MessageSquare,
  Download,
  Eye,
  Filter,
  ChevronRight,
  Upload,
  Play,
  Save,
  Copy,
  FileUp,
  Info,
  MessageCircle,
  Code2,
  Settings,
  Zap,
  CheckCircle,
  Loader2,
  FileIcon
} from 'lucide-react';

function PDFChatInterface() {
  const [schemaJson, setSchemaJson] = useState(
  JSON.stringify(
    {
      UnitOfMeasure: "",
      NumberOfCartons: "",
      PricePerUnit: "",
      ExtendedAmount: "",
      OrderDetailNotes: "",
      CustomerName: "",
      DeliveryAddress: "",
      OrderDate: "",
      DeliveryDate: "",
      FileName: "",
      Currency: "",
      Language:"",
    },
    null,
    2
  )
);

  const [structuredMarkdown, setStructuredMarkdown] = useState("");
  const [outputJson, setOutputJson] = useState(null);
  const [outputFormat, setOutputFormat] = useState("json");
  const [xmlOutput, setXmlOutput] = useState("");
  const [inputPrompt, setInputPrompt] = useState("");
  const [suggestedPrompt, setSuggestedPrompt] = useState(null);
  const [documentId, setDocumentId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [trying, setTrying] = useState(false);
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState("");
  const [fileType, setFileType] = useState("");
  const [activeTab, setActiveTab] = useState("schema");
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");
  const [notificationType, setNotificationType] = useState("success");

  const fileInputRef = useRef(null);
  const uploadedFile = useRef(null);

  const jsonToXml = (data) => {
    const convert = (value, key) => {
      if (value === null || value === undefined) {
        return `<${key}>null</${key}>`;
      }
      if (typeof value === "object" && !Array.isArray(value)) {
        const children = Object.entries(value)
          .map(([childKey, childValue]) => convert(childValue, childKey))
          .join("");
        return `<${key}>${children}</${key}>`;
      }
      if (Array.isArray(value)) {
        const items = value
          .map((item) => convert(item, key.slice(0, -1) || "item"))
          .join("");
        return items;
      }
      return `<${key}>${String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")}</${key}>`;
    };

    if (typeof data !== "object" || data === null) {
      return "<root></root>";
    }

    const body = Object.entries(data)
      .map(([key, value]) => convert(value, key))
      .join("");
    return `<root>${body}</root>`;
  };

  // Function to convert empty strings to null in JSON
  const convertEmptyStringsToNull = (obj) => {
    if (typeof obj !== 'object' || obj === null) return obj;
    
    if (Array.isArray(obj)) {
      return obj.map(item => convertEmptyStringsToNull(item));
    }
    
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value === "") {
        result[key] = null;
      } else if (typeof value === 'object' && value !== null) {
        result[key] = convertEmptyStringsToNull(value);
      } else {
        result[key] = value;
      }
    }
    return result;
  };

  // Show notification
  const showNotificationMessage = (message, type = "success") => {
    setNotificationMessage(message);
    setNotificationType(type);
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 3000);
  };

  // File upload
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      uploadedFile.current = file;
      setFileName(file.name);
      setFileSize((file.size / 1024).toFixed(2) + " KB");
      
      // Extract file extension/type
      const fileNameParts = file.name.split('.');
      const extension = fileNameParts.length > 1 
        ? fileNameParts[fileNameParts.length - 1].toUpperCase() 
        : 'Unknown';
      setFileType(`.${extension}`);
      
      // Animation effect for file upload
      const uploadBtn = document.querySelector('.upload-button');
      if (uploadBtn) {
        uploadBtn.classList.add('upload-success');
        setTimeout(() => uploadBtn.classList.remove('upload-success'), 2000);
      }
    }
  };

  // Process file
  const handleProcessFile = async () => {
    if (!uploadedFile.current) {
      showNotificationMessage("Please upload a file first.", "error");
      return;
    }
    if (!schemaJson.trim()) {
      showNotificationMessage("Please provide schema JSON.", "error");
      return;
    }

    try {
      setLoading(true);
      setOutputJson(null);
      setXmlOutput("");
      setOutputFormat("json");

      const formData = new FormData();
      formData.append("file", uploadedFile.current);
      formData.append("schema_json", schemaJson);

      const response = await axios.post(
        "http://0.0.0.0:8080/process-document",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      if (response.data.status === "success") {
        setStructuredMarkdown(response.data.structured_markdown);
        
        // Convert empty strings to null in the output JSON
        const processedJson = convertEmptyStringsToNull(response.data.generated_json);
        setOutputJson(processedJson);
        setXmlOutput(jsonToXml(processedJson));
        
        setDocumentId(response.data.document_id);

        if (response.data.suggested_prompt) {
          setSuggestedPrompt(response.data.suggested_prompt);
        }
        
        showNotificationMessage("File processed successfully!");
      } else {
        showNotificationMessage("Error: " + response.data.message, "error");
      }
    } catch (error) {
      showNotificationMessage("API call failed: " + error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  // Try prompt
  const handleTryPrompt = async () => {
    if (!inputPrompt.trim() || !documentId) return;
    try {
      setTrying(true);
      const res = await axios.post("http://0.0.0.0:8080/try-prompt", {
        document: structuredMarkdown,
        user_prompt: inputPrompt,
        schema_json: schemaJson,
      });
      
      // Convert empty strings to null in the output JSON
      const processedJson = convertEmptyStringsToNull(res.data.generated_json);
      setOutputJson(processedJson);
      setXmlOutput(jsonToXml(processedJson));
    } catch (err) {
      showNotificationMessage("Try prompt failed: " + err.message, "error");
    } finally {
      setTrying(false);
    }
  };

  // Save prompt
  const handleSavePrompt = async () => {
    if (!inputPrompt.trim() || !documentId) return;
    try {
      await axios.post("http://0.0.0.0:8080/save-prompt", {
        document_id: documentId,
        user_prompt: inputPrompt,
      });
      setSuggestedPrompt(inputPrompt);
      showNotificationMessage("Prompt saved successfully!");
    } catch (err) {
      showNotificationMessage("Failed to save prompt: " + err.message, "error");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 relative overflow-hidden">
      {/* Animated background elements */}
      
      {/* Notification */}
      {showNotification && (
        <div className={`fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 transition-all duration-300 transform backdrop-blur-sm ${
          notificationType === 'success' 
            ? 'bg-green-500/20 text-green-300 border border-green-500/30' 
            : 'bg-red-500/20 text-red-300 border border-red-500/30'
        } animate-fade-in`}>
          <div className="flex items-center space-x-2">
            {notificationType === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            <span>{notificationMessage}</span>
          </div>
        </div>
      )}
      
      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-10 transform transition-all duration-500">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-white to-slate-200 bg-clip-text text-transparent mb-3 animate-fade-in-down">
            Document Intelligence Platform
          </h1>
          <p className="text-slate-400 text-lg animate-fade-in-up">
            Upload, analyze, and extract structured data from documents with AI-powered precision
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - File Info and Description */}
          <div className="lg:col-span-1 space-y-6">
            {/* File Info */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 shadow-lg p-6 transform transition-all duration-300 hover:shadow-xl animate-fade-in-left">
              <h2 className="text-xl font-semibold mb-4 flex items-center text-white">
                <FileText className="w-5 h-5 mr-2 text-blue-400" />
                File Information
              </h2>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".pdf,.doc,.docx,.xls,.xlsx"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="mb-4 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl w-full flex items-center justify-center upload-button transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl border border-blue-500/30"
              >
                <Upload className="w-5 h-5 mr-2" />
                Upload File
              </button>
              
              {fileName && (
                <div className="mt-4 space-y-3 p-4 bg-slate-700/30 rounded-xl border border-slate-600/50 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <FileIcon className="w-6 h-6 text-blue-400" />
                      <div className="ml-3">
                        <p className="text-white font-semibold truncate max-w-xs">
                          {fileName}
                        </p>
                        <p className="text-slate-400 text-sm">
                          {fileType} • {fileSize}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-600/50">
                    <div className="flex flex-col items-center justify-center p-2 bg-slate-700/50 rounded-lg border border-slate-600/50">
                      <span className="text-xs text-slate-400">Type</span>
                      <span className="text-sm font-medium text-blue-400">{fileType}</span>
                    </div>
                    <div className="flex flex-col items-center justify-center p-2 bg-slate-700/50 rounded-lg border border-slate-600/50">
                      <span className="text-xs text-slate-400">Size</span>
                      <span className="text-sm font-medium text-blue-400">{fileSize}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Description Window with Markdown */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 shadow-lg p-6 transform transition-all duration-300 hover:shadow-xl animate-fade-in-left">
              <h2 className="text-xl font-semibold mb-4 flex items-center text-white">
                <Info className="w-5 h-5 mr-2 text-blue-400" />
                Documentation
              </h2>
              <div className="bg-slate-700/30 rounded-xl p-4 h-96 overflow-y-auto border border-slate-600/50 markdown-content">
                <ReactMarkdown>
                  {structuredMarkdown}
                </ReactMarkdown>
              </div>
            </div>
          </div>

          {/* Right Column - Schema, Chat, and Output */}
          <div className="lg:col-span-2 space-y-6">
            {/* Schema JSON Input */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 shadow-lg p-6 transform transition-all duration-300 hover:shadow-xl animate-fade-in">
              <div className="flex border-b border-slate-600/50 mb-4">
                <button 
                  className={`px-4 py-2 font-medium flex items-center space-x-2 ${
                    activeTab === 'schema' 
                      ? 'text-blue-400 border-b-2 border-blue-400' 
                      : 'text-slate-400 hover:text-slate-300'
                  }`}
                  onClick={() => setActiveTab('schema')}
                >
                  <Settings className="w-4 h-4" />
                  <span>Schema Editor</span>
                </button>
                <button 
                  className={`px-4 py-2 font-medium flex items-center space-x-2 ${
                    activeTab === 'preview' 
                      ? 'text-blue-400 border-b-2 border-blue-400' 
                      : 'text-slate-400 hover:text-slate-300'
                  }`}
                  onClick={() => setActiveTab('preview')}
                >
                  <Eye className="w-4 h-4" />
                  <span>Preview</span>
                </button>
              </div>
              
              {activeTab === 'schema' ? (
                <textarea
                  value={schemaJson}
                  onChange={(e) => setSchemaJson(e.target.value)}
                  placeholder='Enter schema JSON (e.g., {"order_id": "", "customer_name": ""})'
                  className="w-full px-4 py-3 border border-slate-600/50 bg-slate-700/30 text-white rounded-xl h-32 focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all duration-300 font-mono text-sm placeholder-slate-400"
                />
              ) : (
                <div className="bg-slate-700/30 p-4 rounded-xl h-32 overflow-auto border border-slate-600/50">
                  <pre className="text-slate-200 text-sm font-mono">
                    {schemaJson}
                  </pre>
                </div>
              )}
              
              <div className="w-full flex justify-center mt-4">
                <button
                  onClick={handleProcessFile}
                  disabled={loading}
                  className={`px-8 py-3 rounded-xl font-medium text-white transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl border border-blue-500/30 ${
                    loading 
                      ? "bg-slate-600 cursor-not-allowed" 
                      : "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  } flex items-center justify-center`}
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5 mr-2" />
                      Process File
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Chat */}
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 shadow-lg p-6 flex flex-col transform transition-all duration-300 hover:shadow-xl animate-fade-in">
                <h2 className="text-xl font-semibold mb-4 flex items-center text-white">
                  <MessageCircle className="w-5 h-5 mr-2 text-blue-400" />
                  Prompt Window
                </h2>
                
                {suggestedPrompt && (
                  <div className="mb-4 p-3 bg-blue-500/20 rounded-lg border border-blue-500/30 animate-fade-in">
                    <p className="text-sm text-blue-300">
                      <span className="font-semibold">Suggested Prompt:</span> {suggestedPrompt}
                    </p>
                  </div>
                )}
                
                <textarea
                  value={inputPrompt}
                  onChange={(e) => setInputPrompt(e.target.value)}
                  placeholder="Enter or modify your prompt here..."
                  className="w-full border border-slate-600/50 bg-slate-700/30 text-white p-3 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all duration-300 h-32 resize-none placeholder-slate-400"
                />
                
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={handleTryPrompt}
                    disabled={trying}
                    className={`px-5 py-2.5 rounded-xl text-white transition-all duration-300 transform hover:scale-105 active:scale-95 flex-1 flex items-center justify-center border border-green-500/30 shadow-lg hover:shadow-xl ${
                      trying
                        ? "bg-green-600/50 cursor-wait"
                        : "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                    }`}
                  >
                    {trying ? (
                      <>
                        <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" />
                        Trying...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        Try Prompt
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={handleSavePrompt}
                    className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl border border-blue-500/30 flex items-center justify-center"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save
                  </button>
                </div>
              </div>

              {/* Output JSON */}
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 shadow-lg p-6 transform transition-all duration-300 hover:shadow-xl animate-fade-in-right">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold flex items-center text-white">
                    <Code2 className="w-5 h-5 mr-2 text-blue-400" />
                    Output
                  </h2>
                  <div className="flex items-center rounded-full bg-slate-700/50 p-1 text-xs font-medium border border-slate-600/50">
                    <button
                      className={`px-3 py-1 rounded-full transition-colors flex items-center space-x-1 ${
                        outputFormat === "json" 
                          ? "bg-blue-500/20 text-blue-300 border border-blue-500/30" 
                          : "text-slate-400 hover:text-slate-300"
                      }`}
                      onClick={() => setOutputFormat("json")}
                    >
                      <Code2 className="w-3 h-3" />
                      <span>JSON</span>
                    </button>
                    <button
                      className={`px-3 py-1 rounded-full transition-colors flex items-center space-x-1 ${
                        outputFormat === "xml" 
                          ? "bg-blue-500/20 text-blue-300 border border-blue-500/30" 
                          : "text-slate-400 hover:text-slate-300"
                      }`}
                      onClick={() => setOutputFormat("xml")}
                    >
                      <FileText className="w-3 h-3" />
                      <span>XML</span>
                    </button>
                  </div>
                </div>
                
                <div className="bg-slate-700/30 rounded-xl p-4 h-96 overflow-y-auto border border-slate-600/50">
                  {outputJson ? (
                    <pre className="text-slate-200 whitespace-pre-wrap text-sm font-mono animate-fade-in">
                      {outputFormat === "json"
                        ? JSON.stringify(outputJson, null, 2)
                        : xmlOutput}
                    </pre>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-400 animate-pulse">
                      <div className="text-center">
                        <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>No JSON generated yet. Process a file to see results.</p>
                      </div>
                    </div>
                  )}
                </div>
                
                {outputJson && (
                  <button 
                    className="mt-4 px-4 py-2 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 rounded-lg text-sm transition-all duration-300 flex items-center ml-auto border border-slate-600/50"
                    onClick={() => {
                      const textToCopy =
                        outputFormat === "json"
                          ? JSON.stringify(outputJson, null, 2)
                          : xmlOutput;
                      navigator.clipboard.writeText(textToCopy);
                      showNotificationMessage(`${outputFormat.toUpperCase()} copied to clipboard!`);
                    }}
                  >
                    <Copy className="w-4 h-4 mr-1" />
                    Copy {outputFormat.toUpperCase()}
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInLeft {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes fadeInRight {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.6s ease-out forwards;
        }
        .animate-fade-in-left {
          animation: fadeInLeft 0.6s ease-out forwards;
        }
        .animate-fade-in-right {
          animation: fadeInRight 0.6s ease-out forwards;
        }
        .animate-fade-in-down {
          animation: fadeInDown 0.8s ease-out forwards;
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.8s ease-out forwards;
        }
        .upload-success {
          animation: pulse 2s;
        }
        @keyframes pulse {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7); }
          50% { transform: scale(1.05); box-shadow: 0 0 0 10px rgba(59, 130, 246, 0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
        }
        .markdown-content {
          font-size: 0.9rem;
          line-height: 1.5;
          color: #e2e8f0;
        }
        .markdown-content h1, .markdown-content h2, .markdown-content h3 {
          font-weight: 600;
          margin-top: 1.5rem;
          margin-bottom: 1rem;
          color: white;
        }
        .markdown-content h1 {
          font-size: 1.5rem;
          border-bottom: 1px solid #475569;
          padding-bottom: 0.3rem;
        }
        .markdown-content h2 {
          font-size: 1.3rem;
        }
        .markdown-content h3 {
          font-size: 1.1rem;
        }
        .markdown-content p {
          margin-bottom: 1rem;
        }
        .markdown-content ul, .markdown-content ol {
          margin-bottom: 1rem;
          padding-left: 1.5rem;
        }
        .markdown-content li {
          margin-bottom: 0.5rem;
        }
        .markdown-content code {
          background-color: #475569;
          padding: 0.1rem 0.3rem;
          border-radius: 0.25rem;
          font-family: monospace;
          color: #cbd5e1;
        }
        .markdown-content pre {
          background-color: #475569;
          padding: 1rem;
          border-radius: 0.5rem;
          overflow-x: auto;
          margin-bottom: 1rem;
          border: 1px solid #64748b;
        }
        .markdown-content pre code {
          background-color: transparent;
          padding: 0;
        }
      `}</style>
    </div>
  );
}

export default function Home() {
  return <PDFChatInterface />;
}