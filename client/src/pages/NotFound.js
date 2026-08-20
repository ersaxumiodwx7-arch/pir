import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldIcon } from '../components/Icons';
import './NotFound.css';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="not-found-page">
      <div className="not-found-card">
        <div className="not-found-icon">
          <ShieldIcon size={48} />
        </div>
        <h1>404</h1>
        <h2>Page Not Found</h2>
        <p>
          The page you're looking for doesn't exist or you don't have
          permission to access it.
        </p>

      </div>
    </div>
  );
};

export default NotFound;
