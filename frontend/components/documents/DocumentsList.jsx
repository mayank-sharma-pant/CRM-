import { useState, useEffect, useRef } from 'react';
import { Upload, File, FileText, Download, Trash2, Loader2, Image as ImageIcon } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import api from '../../services/api';

export default function DocumentsList({ entityType, entityId, canUpload = true, canDelete = true }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (entityId) fetchDocuments();
  }, [entityId, entityType]);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/documents/${entityType}/${entityId}`);
      setDocuments(res.data);
    } catch (err) {
      console.error("Failed to fetch documents:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append(entityType === 'lead' ? 'lead_id' : 'client_id', entityId);

    try {
      setUploading(true);
      await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      fetchDocuments();
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      alert(err.response?.data?.detail || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (docId, filename) => {
    try {
      const res = await api.get(`/documents/download/${docId}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Download failed');
    }
  };

  const handleDelete = async (doc) => {
    if (!window.confirm(`Delete document "${doc.filename}"?`)) return;
    try {
      await api.delete(`/documents/${doc.id}`);
      fetchDocuments();
    } catch (err) {
      alert(err.response?.data?.detail || 'Delete failed');
    }
  };

  const getFileIcon = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    if (['png', 'jpg', 'jpeg', 'gif', 'svg'].includes(ext)) return <ImageIcon size={14} className="text-blue-500" />;
    if (['pdf'].includes(ext)) return <FileText size={14} className="text-red-500" />;
    return <File size={14} className="text-slate-500" />;
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Documents</h2>
        {canUpload && (
          <div>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              className="hidden" 
              id={`upload-doc-${entityType}`}
            />
            <label 
              htmlFor={`upload-doc-${entityType}`}
              className="cursor-pointer text-xs flex items-center gap-1 text-blue-600 hover:text-blue-700 hover:underline font-bold bg-blue-50 dark:bg-blue-900/30 px-2 py-1.5 rounded transition-all"
            >
              {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
              Upload File
            </label>
          </div>
        )}
      </div>

      <div className="space-y-2">
        {loading ? (
          <p className="text-xs text-slate-400 text-center py-2 animate-pulse">Loading documents...</p>
        ) : documents.length === 0 ? (
          <div className="text-center py-6 px-4 bg-slate-50 dark:bg-slate-700/30 rounded-lg border border-dashed border-slate-200 dark:border-slate-700">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">No documents uploaded</p>
            <p className="text-[10px] text-slate-400">Supported files: PDF, Images, Docs</p>
          </div>
        ) : (
          documents.map(doc => {
            return (
              <div key={doc.id} className="group flex items-center justify-between p-2.5 rounded-lg border border-slate-100 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-700/30 hover:border-blue-100 dark:hover:border-blue-800/50 transition-colors">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-8 h-8 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center flex-shrink-0 shadow-sm">
                    {getFileIcon(doc.filename)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate cursor-pointer hover:text-blue-600 transition-colors" onClick={() => handleDownload(doc.id, doc.filename)} title={doc.filename}>
                      {doc.filename}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                      <span className="truncate max-w-[80px]" title={doc.uploaded_by_name}>{doc.uploaded_by_name}</span>
                      <span>•</span>
                      <span>{doc.created_at ? formatDistanceToNow(parseISO(doc.created_at), { addSuffix: true }) : ''}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pl-2">
                  <button 
                    onClick={() => handleDownload(doc.id, doc.filename)}
                    className="p-1.5 text-slate-400 hover:text-blue-600 bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 rounded transition-colors"
                    title="Download"
                  >
                    <Download size={12} />
                  </button>
                  {canDelete && (
                    <button 
                      onClick={() => handleDelete(doc)}
                      className="p-1.5 text-slate-400 hover:text-red-600 bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 rounded transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
