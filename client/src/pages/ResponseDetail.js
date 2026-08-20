import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { submissionsAPI } from '../services/api';
import toast from 'react-hot-toast';
import { StarIcon, CreditCardIcon, ArrowLeftIcon } from '../components/Icons';

const ResponseDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSubmission();
  }, [id]);

  const loadSubmission = async () => {
    try {
      const response = await submissionsAPI.getById(id);
      setSubmission(response.data);
    } catch (error) {
      toast.error('Failed to load submission');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const renderFieldValue = (answer) => {
    if (!answer.value) return <span style={{ color: '#999' }}>No answer</span>;

    switch (answer.type) {
      case 'checkbox':
        try {
          const values = JSON.parse(answer.value);
          return Array.isArray(values) ? values.join(', ') : answer.value;
        } catch {
          return answer.value;
        }
      case 'rating':
        const rating = parseInt(answer.value);
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {Array.from({ length: rating }, (_, i) => (
              <StarIcon key={i} size={16} style={{ color: '#f59e0b' }} />
            ))}
            <span style={{ marginLeft: '5px', color: '#666' }}>({rating}/10)</span>
          </div>
        );
      case 'card':
        try {
          const card = JSON.parse(answer.value);
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><CreditCardIcon size={16} /> {card.name || '—'}</div>
              <div>Card Number: {card.number || '—'}</div>
              <div>Expiry: {card.expiry || '—'}</div>
              <div>CVV: {card.cvv || '—'}</div>
            </div>
          );
        } catch {
          return answer.value;
        }
      default:
        return answer.value;
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!submission) {
    return <div className="container">Submission not found</div>;
  }

  return (
    <div className="container">
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">Response Details</h2>
            <p style={{ color: '#666', marginTop: '5px' }}>
              Submission #{submission.id} • {new Date(submission.submitted_at).toLocaleString()}
            </p>
          </div>
          <button
            className="btn btn-secondary"
            onClick={() => navigate(-1)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <ArrowLeftIcon size={16} /> Back
          </button>
        </div>

        <div className="response-details">
          {submission.answers && submission.answers.length > 0 ? (
            submission.answers.map((answer) => (
              <div key={answer.id} className="answer-item">
                <div className="answer-label">
                  {answer.label}
                  {answer.required && <span className="required">*</span>}
                </div>
                <div className="answer-value">
                  {renderFieldValue(answer)}
                </div>
              </div>
            ))
          ) : (
            <p style={{ color: '#666', textAlign: 'center', padding: '20px' }}>
              No answers recorded for this submission
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResponseDetail;
