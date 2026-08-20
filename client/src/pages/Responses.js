import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { formsAPI, submissionsAPI } from '../services/api';
import toast from 'react-hot-toast';

const Responses = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const [formRes, submissionsRes] = await Promise.all([
        formsAPI.getById(id),
        submissionsAPI.getByFormId(id),
      ]);
      setForm(formRes.data);
      setSubmissions(submissionsRes.data);
    } catch (error) {
      toast.error('Failed to load data');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const response = await submissionsAPI.exportCSV(id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `form_${id}_submissions.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('CSV exported successfully');
    } catch (error) {
      toast.error('Failed to export CSV');
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="container">
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">{form?.title || 'Form'} - Responses</h2>
            <p style={{ color: '#666', marginTop: '5px' }}>
              {submissions.length} submission{submissions.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div>
            <button className="btn btn-success" onClick={handleExportCSV}>
              Export CSV
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => navigate('/dashboard')}
              style={{ marginLeft: '10px' }}
            >
              Back to Dashboard
            </button>
          </div>
        </div>

        {submissions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            <h3>No responses yet</h3>
            <p>Share your form link to start collecting responses</p>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Submission ID</th>
                <th>Submitted At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((submission) => (
                <tr key={submission.id}>
                  <td>#{submission.id}</td>
                  <td>{new Date(submission.submitted_at).toLocaleString()}</td>
                  <td>
                    <button
                      className="btn btn-primary"
                      onClick={() => navigate(`/responses/${submission.id}`)}
                      style={{ padding: '6px 12px', fontSize: '12px' }}
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Responses;
