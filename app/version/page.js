"use client";

import { useState, useEffect } from 'react';
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
  History,
  Edit,
  Layers,
  GitBranch,
  Copy,
  CheckCircle,
  ArrowUpDown,
  FileUp
} from 'lucide-react';

function VersionBadge({ version, isCurrent }) {
  return (
    <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${
      isCurrent 
        ? 'bg-green-500/20 text-green-300 border-green-500/30' 
        : version === 0 
          ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
          : 'bg-purple-500/20 text-purple-300 border-purple-500/30'
    }`}>
      <GitBranch className="w-3 h-3 mr-1" />
      v{version}
      {isCurrent && <CheckCircle className="w-3 h-3 ml-1" />}
    </div>
  );
}

function DocumentCard({ document, index, isSelected, onClick }) {
  const currentVersion = document.versions[document.current_version];
  
  return (
    <div
      className={`bg-slate-800/50 backdrop-blur-sm rounded-xl border transition-all duration-300 hover:shadow-xl cursor-pointer transform hover:-translate-y-1 ${
        isSelected 
          ? 'border-blue-500/60 ring-2 ring-blue-500/20 scale-[1.02] bg-slate-800/70' 
          : 'border-slate-700/50 hover:border-blue-400/40 hover:bg-slate-800/70'
      }`}
      onClick={onClick}
      style={{ 
        animationDelay: `${index * 100}ms`,
        animation: 'slideInUp 0.6s ease-out both'
      }}
    >
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white shadow-lg">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-white line-clamp-1">
                {document.filename}
              </h3>
              <p className="text-sm text-slate-400 capitalize">
                {document.file_type}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end space-y-2">
            
            <div className={`px-2 py-1 rounded text-xs font-medium flex items-center space-x-1 ${
              'bg-slate-700/50 text-slate-400 border border-slate-600/50'
            }`}>
              <Calendar className="w-3 h-3" />
              <span>{formatDate(document.created_at)}</span>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm mb-4">
          <div>
            <div className="flex items-center space-x-1 text-slate-400 mb-1">
              <User className="w-3 h-3" />
              <span className="text-xs">Client</span>
            </div>
            <p className="font-medium text-white">
              {document.client_name}
            </p>
          </div>
          <div>
            <div className="flex items-center space-x-1 text-slate-400 mb-1">
              <MessageSquare className="w-3 h-3" />
              <span className="text-xs">Language</span>
            </div>
            <p className="font-medium text-white">
              {document.language}
            </p>
          </div>
        </div>

        {/* Version Timeline Preview */}
        <div className="border-t border-slate-700/50 pt-3">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2 text-slate-400">
              <History className="w-3 h-3" />
              <span>Version History</span>
            </div>
            <span className="text-slate-500">
              {document.versions.length} version{document.versions.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex space-x-1 mt-2">
            {document.versions.slice(-3).map((version, idx) => (
              <div
                key={version.version}
                className={`h-1 flex-1 rounded ${
                  version.type === 'system' 
                    ? 'bg-blue-500' 
                    : 'bg-purple-500'
                }`}
                title={`v${version.version} - ${version.type}`}
              />
            ))}
            {document.versions.length > 3 && (
              <div className="h-1 flex-1 rounded bg-slate-600" title="More versions" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function VersionHistory({ versions, currentVersion, onEditPrompt }) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
        <History className="w-5 h-5 text-blue-400" />
        <span>Version History</span>
      </h3>
      
      <div className="space-y-3">
        {versions.map((version) => (
          <div
            key={version.version}
            className={`p-4 rounded-lg border transition-all duration-200 bg-slate-700/30 border-slate-600/50 hover:bg-slate-700/50`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center space-x-3">
                <VersionBadge 
                  version={version.version} 
                  isCurrent={version.version === currentVersion} 
                />
                <span className={`text-sm font-medium ${
                  version.type === 'system' ? 'text-blue-300' : 'text-purple-300'
                }`}>
                  {version.type === 'system' ? 'System Prompt' : 'User Prompt'}
                </span>
              </div>
              
            </div>
            
            {/* Only show prompt for user versions (v1+) */}
            {version.type === 'user' && (
              <p className="text-slate-200 text-sm mb-3 whitespace-pre-wrap">
                {version.prompt}
              </p>
            )}
            
            {/* Show edit button only for user prompts */}
            {version.type === 'user' && (
              <div className="flex justify-end">
                <button
                  onClick={() => onEditPrompt(version)}
                  className="flex items-center space-x-1 text-blue-400 hover:text-blue-300 transition-colors text-sm"
                >
                  <Edit className="w-3 h-3" />
                  <span>Edit Prompt</span>
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function DocumentVersionModal({ document, isOpen, onClose, onUpdatePrompt }) {
  const [editingPrompt, setEditingPrompt] = useState(null);
  const [editedText, setEditedText] = useState('');
  const [saveStatus, setSaveStatus] = useState(''); // 'saving', 'success', 'error'

  if (!isOpen) return null;

  const handleEdit = (version) => {
    setEditingPrompt(version);
    setEditedText(version.prompt);
    setSaveStatus('');
  };

  const handleSaveEdit = async () => {
    if (editingPrompt && editedText.trim()) {
      setSaveStatus('saving');
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      try {
        onUpdatePrompt(document.id, editingPrompt.version, editedText.trim());
        setSaveStatus('success');
        
        // Clear editing state after successful save
        setTimeout(() => {
          setEditingPrompt(null);
          setEditedText('');
          setSaveStatus('');
        }, 1500);
      } catch (error) {
        setSaveStatus('error');
      }
    }
  };

  const handleCancelEdit = () => {
    setEditingPrompt(null);
    setEditedText('');
    setSaveStatus('');
  };

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Layers className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Version Control</h2>
                <p className="text-slate-400 text-sm">{document.filename}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center transition-colors duration-200 group"
            >
              <X className="w-4 h-4 text-slate-300 group-hover:text-white" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Document Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-700/30 rounded-lg border border-slate-600/50">
            <div>
              <label className="text-sm font-medium text-slate-400">Filename</label>
              <p className="text-white font-medium">{document.filename}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-400">Client</label>
              <p className="text-white font-medium">{document.client_name}</p>
            </div>
          </div>

          {/* Version History */}
          <VersionHistory 
            versions={document.versions}
            currentVersion={document.current_version}
            onEditPrompt={handleEdit}
          />

          {/* Edit Prompt Section */}
          {editingPrompt && (
            <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/30">
              <h4 className="text-lg font-semibold text-white mb-3 flex items-center space-x-2">
                <Edit className="w-5 h-5 text-blue-400" />
                <span>Edit Prompt v{editingPrompt.version}</span>
              </h4>
              <textarea
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                className="w-full h-32 px-3 py-2 border border-slate-600/50 bg-slate-700/50 text-white rounded-lg focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all duration-200 resize-none"
                placeholder="Enter your prompt..."
              />
              
              {/* Save Status Indicator */}
              {saveStatus === 'saving' && (
                <div className="flex items-center space-x-2 text-blue-400 text-sm mt-2">
                  <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                  <span>Saving changes...</span>
                </div>
              )}
              
              {saveStatus === 'success' && (
                <div className="flex items-center space-x-2 text-green-400 text-sm mt-2">
                  <CheckCircle className="w-4 h-4" />
                  <span>Changes saved successfully!</span>
                </div>
              )}
              
              {saveStatus === 'error' && (
                <div className="flex items-center space-x-2 text-red-400 text-sm mt-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>Failed to save changes. Please try again.</span>
                </div>
              )}

              <div className="flex space-x-3 mt-3">
                <button
                  onClick={handleSaveEdit}
                  disabled={saveStatus === 'saving' || !editedText.trim()}
                  className={`px-4 py-2 text-white rounded-lg transition-colors duration-200 flex items-center space-x-2 ${
                    saveStatus === 'saving' || !editedText.trim()
                      ? 'bg-blue-400 cursor-not-allowed'
                      : 'bg-blue-500 hover:bg-blue-600'
                  }`}
                >
                  {saveStatus === 'saving' ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
                <button
                  onClick={handleCancelEdit}
                  disabled={saveStatus === 'saving'}
                  className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SearchBar({ searchTerm, onSearchChange, resultsCount, totalCount }) {
  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 shadow-lg p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex-1 max-w-2xl">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Search by filename or client..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-10 py-3 border border-slate-600/50 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 bg-slate-700/50 text-white placeholder-slate-400 focus:bg-slate-700/70"
            />
            {searchTerm && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-300 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full font-medium border border-blue-500/30">
            {resultsCount} of {totalCount} documents
          </span>
        </div>
      </div>
    </div>
  );
}

function FilterBar({ filters, onFilterChange }) {
  return (
    <div className="bg-slate-800/30 backdrop-blur-sm rounded-xl border border-slate-700/50 p-4">
      <div className="flex flex-wrap gap-4">
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={filters.versionFilter}
            onChange={(e) => onFilterChange('versionFilter', e.target.value)}
            className="bg-slate-700/50 border border-slate-600/50 text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/50 focus:border-transparent"
          >
            <option value="all">All Versions</option>
            <option value="system-only">System Prompts Only</option>
            <option value="user-only">User Prompts Only</option>
            <option value="multiple">Multiple Versions</option>
          </select>
        </div>
        
        <div className="flex items-center space-x-2">
          <ArrowUpDown className="w-4 h-4 text-slate-400" />
          <select
            value={filters.sortBy}
            onChange={(e) => onFilterChange('sortBy', e.target.value)}
            className="bg-slate-700/50 border border-slate-600/50 text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/50 focus:border-transparent"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="versions">Most Versions</option>
            <option value="name">Name A-Z</option>
          </select>
        </div>
      </div>
    </div>
  );
}

function formatDate(dateString) {
  if (!dateString) return 'NULL';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB');
  } catch {
    return 'NULL';
  }
}

export default function VersionControlPage() {
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [documents, setDocuments] = useState([]);
  const [filters, setFilters] = useState({
    versionFilter: 'all',
    sortBy: 'newest'
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch documents from backend
  const fetchDocuments = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('http://localhost:8080/documents-with-versions/');
      const data = await response.json();
      
      if (data.status === 'success') {
        setDocuments(data.documents);
      } else {
        setError(data.message || 'Failed to fetch documents');
      }
    } catch (err) {
      setError('Failed to connect to backend. Make sure the server is running.');
      console.error('Error fetching documents:', err);
    } finally {
      setLoading(false);
    }
  };

  // Initialize with real data from backend
  useEffect(() => {
    fetchDocuments();
  }, []);

  // Filter and sort documents
  const filteredDocuments = documents.filter(doc => {
    // Search filter
    const matchesSearch = !searchTerm.trim() || 
      doc.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.client_name.toLowerCase().includes(searchTerm.toLowerCase());

    // Version filter
    const matchesVersion = filters.versionFilter === 'all' ||
      (filters.versionFilter === 'system-only' && doc.versions.length === 1) ||
      (filters.versionFilter === 'user-only' && doc.versions.length > 1) ||
      (filters.versionFilter === 'multiple' && doc.versions.length > 2);

    return matchesSearch && matchesVersion;
  }).sort((a, b) => {
    switch (filters.sortBy) {
      case 'newest':
        return new Date(b.created_at) - new Date(a.created_at);
      case 'oldest':
        return new Date(a.created_at) - new Date(b.created_at);
      case 'versions':
        return b.versions.length - a.versions.length;
      case 'name':
        return a.filename.localeCompare(b.filename);
      default:
        return 0;
    }
  });

  const handleUpdatePrompt = async (docId, version, newPrompt) => {
    try {
      // Extract numeric ID from 'doc-{id}' format
      const numericId = parseInt(docId.replace('doc-', ''));
      
      const response = await fetch(`http://localhost:8080/document/${numericId}/version/${version}/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newPrompt),
      });
      
      const data = await response.json();
      
      if (data.status === 'success') {
        // Refresh documents to get updated data
        await fetchDocuments();
        
        // Update selected document if it's the one being edited
        if (selectedDocument && selectedDocument.id === docId) {
          const updatedDoc = documents.find(doc => doc.id === docId);
          if (updatedDoc) {
            setSelectedDocument(updatedDoc);
          }
        }
      } else {
        throw new Error(data.message || 'Failed to update prompt');
      }
    } catch (error) {
      console.error('Error updating prompt:', error);
      throw error; // Re-throw to let the modal handle the error
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 md:p-8">
      <style jsx global>{`
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        .animate-scaleIn {
          animation: scaleIn 0.3s ease-out;
        }
      `}</style>

      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-slate-200 bg-clip-text text-transparent flex items-center space-x-3">
              <GitBranch className="w-8 h-8 text-blue-400" />
              <span>Version Control</span>
            </h1>
            <p className="text-slate-400 text-lg">
              Track and manage document processing versions with prompt history
            </p>
          </div>
          
          {/* Stats Summary */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6">
            <div className="grid grid-cols-1 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-white">{documents.length}</p>
                <p className="text-sm text-slate-400">Total Documents</p>
              </div>
              
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="space-y-4">
          <SearchBar
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            resultsCount={filteredDocuments.length}
            totalCount={documents.length}
          />
          <FilterBar filters={filters} onFilterChange={(key, value) => 
            setFilters(prev => ({ ...prev, [key]: value }))
          } />
        </div>

        {/* Documents Grid */}
        <div className="bg-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-700/50 shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center space-x-2">
                <Layers className="w-6 h-6 text-blue-400" />
                <span>Document Versions</span>
              </h2>
              <p className="text-slate-400 mt-1">
                Click on any document to view and edit version history
              </p>
            </div>
            <div className="text-sm text-slate-400">
              {filteredDocuments.length} of {documents.length} documents
            </div>
          </div>

          {loading ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <h3 className="text-lg font-medium text-white mb-2">
                Loading documents...
              </h3>
              <p className="text-slate-400">
                Fetching version history from backend
              </p>
            </div>
          ) : error ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-500/50">
                <AlertCircle className="w-10 h-10 text-red-400" />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">
                Error loading documents
              </h3>
              <p className="text-slate-400 mb-4">
                {error}
              </p>
              <button
                onClick={fetchDocuments}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors duration-200"
              >
                Retry
              </button>
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-slate-700/50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-600/50">
                <FileUp className="w-10 h-10 text-slate-400" />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">
                No documents found
              </h3>
              <p className="text-slate-400">
                Try adjusting your search terms or filters to find what you're looking for.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredDocuments.map((doc, idx) => (
                <DocumentCard
                  key={doc.id}
                  document={doc}
                  index={idx}
                  isSelected={selectedDocument?.id === doc.id}
                  onClick={() => setSelectedDocument(doc)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Version Control Modal */}
      <DocumentVersionModal
        document={selectedDocument}
        isOpen={!!selectedDocument}
        onClose={() => setSelectedDocument(null)}
        onUpdatePrompt={handleUpdatePrompt}
      />
    </div>
  );
}