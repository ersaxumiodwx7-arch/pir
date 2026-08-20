import React, { useState, useEffect } from 'react';
import { clientPortalAPI } from '../services/api';
import './ClientPages.css';

const ClientDocuments = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadDocuments(); }, []);

  const loadDocuments = async () => {
    try {
      const response = await clientPortalAPI.getDocuments();
      setDocuments(response.data);
    } catch (error) {
      console.error('Failed to load documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatSize = (bytes) => {
    if (!bytes) return '—';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const getFileIcon = (type) => {
    switch (type) {
      case 'pdf': return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
      );
      case 'image': return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
      );
      default: return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
      );
    }
  };

  return (
    <div className="client-page">
      <div className="client-page-header">
        <div>
          <h1>Documents</h1>
          <p className="client-page-subtitle">Files and documents shared with your account</p>
        </div>
      </div>

      <div className="client-card">
        {loading ? (
          <div className="client-page-loading"><div className="client-loading-spinner"></div></div>
        ) : documents.length === 0 ? (
          <div className="client-card-empty">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
            </svg>
            <h3>No documents yet</h3>
            <p>Documents shared with you will appear here</p>
          </div>
        ) : (
          <div className="client-documents-grid">
            {documents.map((doc) => (
              <div key={doc.id} className="client-document-card">
                <div className="client-document-icon">
                  {getFileIcon(doc.document_type)}
                </div>
                <div className="client-document-info">
                  <div className="client-document-name">{doc.document_name}</div>
                  <div className="client-document-meta">
                    <span>{formatDate(doc.uploaded_at)}</span>
                    {doc.file_size > 0 && <span>• {formatSize(doc.file_size)}</span>}
                  </div>
                  {doc.description && <div className="client-document-desc">{doc.description}</div>}
                </div>
                <div className="client-document-status">
                  <span className={`client-status-badge status-${doc.status}`}>
                    {doc.status?.charAt(0).toUpperCase() + doc.status?.slice(1)}
                  </span>
                </div>
                {doc.file_path && (
                  <a href={`http://localhost:5000/${doc.file_path}`} target="_blank" rel="noopener noreferrer" className="client-document-download">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientDocuments;
