import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { LockIcon, CheckCircleIcon, ShieldIcon } from '../components/Icons';
import './Login.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const result = await login(email, password);
    
    if (result.success) {
      toast.success('Login successful');
      navigate('/dashboard');
    } else {
      toast.error(result.error);
    }
    
    setLoading(false);
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1 className="login-title">Pirates Panel</h1>
          <p className="login-subtitle">Admin Control Center</p>
        </div>
        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-group">
            <label>Username</label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Enter your username"
            />
          </div>
          <div className="login-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
          </div>
          <button type="submit" className="login-submit" disabled={loading}>
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                <span className="login-btn-spinner"></span>
                Authenticating...
              </span>
            ) : 'Secure Login'}
          </button>
        </form>
        <div className="login-security">
          <div className="login-security-item">
            <LockIcon size={16} className="login-security-icon" />
            <span>256-bit Encryption</span>
          </div>
          <div className="login-security-item">
            <CheckCircleIcon size={16} className="login-security-icon" />
            <span>Secure Access</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
