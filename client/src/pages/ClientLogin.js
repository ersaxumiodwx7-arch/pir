import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClientAuth } from '../context/ClientAuthContext';
import toast from 'react-hot-toast';
import { ShieldIcon, LockIcon, SearchIcon, CheckCircleIcon, XCircleIcon, ArrowRightIcon, ArrowLeftIcon, StarIcon } from '../components/Icons';
import './ClientLogin.css';

const ClientLogin = () => {
  const [caseId, setCaseId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [resetCaseId, setResetCaseId] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [showAgentVerify, setShowAgentVerify] = useState(false);
  const [agentId, setAgentId] = useState('');
  const [agentResult, setAgentResult] = useState(null);
  const [verifyingAgent, setVerifyingAgent] = useState(false);
  const { login } = useClientAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const result = await login(caseId, password);
    
    if (result.success) {
      toast.success('Welcome back!');
      navigate('/client/dashboard');
    } else {
      toast.error(result.error);
    }
    
    setLoading(false);
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setResetLoading(true);
    try {
      const { clientPortalAPI } = await import('../services/api');
      await clientPortalAPI.forgotPassword({ case_id: resetCaseId, email: resetEmail });
      toast.success('If your account exists, a reset link has been generated.');
      setShowForgot(false);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to process request');
    }
    setResetLoading(false);
  };

  const handleVerifyAgent = async (e) => {
    e.preventDefault();
    if (!agentId.trim()) {
      toast.error('Please enter an Agent ID');
      return;
    }
    setVerifyingAgent(true);
    setAgentResult(null);
    try {
      const { agentVerificationAPI } = await import('../services/api');
      const response = await agentVerificationAPI.verify(agentId.trim());
      setAgentResult(response.data);
    } catch (error) {
      toast.error('Failed to verify agent');
    } finally {
      setVerifyingAgent(false);
    }
  };

  return (
    <div className="banking-page">
      {/* Top Banner */}
      <div className="banking-top-banner">
        <ShieldIcon size={16} className="banner-icon" />
        FDIC — Member FDIC. Deposits insured up to $250,000
      </div>

      {/* Trusted By Section */}
      <div className="banking-trusted-bar">
        <div className="trusted-content">
          <span className="trusted-label">TRUSTED BY LEADING FINANCIAL INSTITUTIONS</span>
          <div className="trusted-logos">
            <span className="bank-logo">TD Bank</span>
            <span className="bank-logo">USAA</span>
            <span className="bank-logo">Chase</span>
            <span className="bank-logo">Wells Fargo</span>
            <span className="bank-logo">PNC</span>
            <span className="bank-logo">Citi</span>
          </div>
        </div>
      </div>

      {/* Official Website Bar */}
      <div className="banking-official-bar">
        <div className="official-content">
          <div className="official-left">
            <span className="flag-icon">
              <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
                <rect width="16" height="12" fill="#002868"/>
                <rect y="1" width="16" height="1" fill="#BF0A30"/>
                <rect y="3" width="16" height="1" fill="#BF0A30"/>
                <rect y="5" width="16" height="1" fill="#BF0A30"/>
                <rect y="7" width="16" height="1" fill="#BF0A30"/>
                <rect y="9" width="16" height="1" fill="#BF0A30"/>
                <rect y="11" width="16" height="1" fill="#BF0A30"/>
                <rect width="7" height="6" fill="#002868"/>
              </svg>
            </span>
            An official website of the United States government
          </div>
          <div className="official-right">
            <span className="search-placeholder">Search FDIC</span>
            <SearchIcon size={16} className="search-icon" />
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="banking-nav">
        <div className="nav-content">
          <div className="nav-logo">
            <span className="fdic-logo-text">FDIC</span>
          </div>
          <div className="nav-links">
            <span className="nav-link">ABOUT</span>
            <span className="nav-link">RESOURCES</span>
            <span className="nav-link">ANALYSIS</span>
            <span className="nav-link">NEWS</span>
            <span className="nav-link nav-signin">SIGN IN</span>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="banking-hero">
        <div className="hero-content">
          <div className="hero-badge">
            <ShieldIcon size={16} className="badge-icon" />
            FDIC Insured Institution
          </div>
          
          <h1 className="hero-title">
            Banking that<br />
            works <em>for you</em>
          </h1>
          
          <p className="hero-description">
            Experience the future of banking with FDIC. Smart tools, premium
            rewards, and industry-leading security to help you achieve your
            financial goals.
          </p>
          
          <div className="hero-trust-indicators">
            <div className="trust-item">
              <CheckCircleIcon size={18} className="trust-icon-green" />
              FDIC insured up to $250,000
            </div>
            <div className="trust-item">
              <ShieldIcon size={18} className="trust-icon-blue" />
              24/7 Secure Banking
            </div>
          </div>

          {/* Login Form */}
          {!showForgot && !showAgentVerify && (
            <div className="login-form-container">
              <div className="signon-header">
                <h2 className="signon-title">Sign On</h2>
                <p className="signon-subtitle">Verified fraud victims — secure case access only</p>
              </div>
              <div className="fraud-victims-only-box">
                <span className="fraud-box-label">FRAUD VICTIMS ONLY</span>
                <p className="fraud-box-text">
                  This portal is <strong>not open to the public</strong> and does not
                  offer self-enrollment. Access is limited to
                  individuals with an active fraud recovery case
                  who received sign-on credentials from an
                  assigned Recovery Specialist.
                </p>
              </div>
              <form onSubmit={handleSubmit} className="banking-login-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>Case ID</label>
                    <input
                      type="text"
                      value={caseId}
                      onChange={(e) => setCaseId(e.target.value.toUpperCase())}
                      placeholder="e.g. CS-A1B2C3D4"
                      required
                      autoFocus
                    />
                  </div>
                  <div className="form-group">
                    <label>Password</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      required
                    />
                  </div>
                </div>
                
                <button type="submit" className="banking-btn-primary" disabled={loading}>
                  {loading ? (
                    <span className="btn-spinner"></span>
                  ) : (
                    <>
                      <ArrowRightIcon size={18} />
                      Sign In
                    </>
                  )}
                </button>

                <button type="button" className="banking-btn-text" onClick={() => { setShowAgentVerify(true); setShowForgot(false); }}>
                  <SearchIcon size={16} />
                  Verify an Agent
                </button>

                <button type="button" className="banking-btn-text" onClick={() => { setShowForgot(true); setShowAgentVerify(false); }}>
                  <LockIcon size={16} />
                  Forgot Password?
                </button>
              </form>

              <div className="login-trust-footer">
                <span className="footer-trust"><LockIcon size={14} /> 256-bit Encrypted</span>
                <span className="footer-trust"><CheckCircleIcon size={14} /> Secure Access</span>
                <span className="footer-trust"><ShieldIcon size={14} /> FDIC Protected</span>
              </div>
            </div>
          )}

          {/* Forgot Password Form */}
          {showForgot && (
            <div className="login-form-container">
              <form onSubmit={handleForgotPassword} className="banking-login-form">
                <h3 style={{ margin: '0 0 8px', fontSize: '18px', color: '#0f172a' }}>Forgot Password</h3>
                <p className="reset-info">Enter your Case ID and we'll generate a password reset.</p>
                <div className="form-row">
                  <div className="form-group">
                    <label>Case ID</label>
                    <input
                      type="text"
                      value={resetCaseId}
                      onChange={(e) => setResetCaseId(e.target.value.toUpperCase())}
                      placeholder="e.g. CS-A1B2C3D4"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Email Address</label>
                    <input
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="Your registered email"
                      required
                    />
                  </div>
                </div>
                <button type="submit" className="banking-btn-primary" disabled={resetLoading}>
                  {resetLoading ? 'Sending...' : 'Request Reset'}
                </button>
                <button type="button" className="banking-btn-text" onClick={() => setShowForgot(false)}>
                  ← Back to Login
                </button>
              </form>
            </div>
          )}

          {/* Agent Verification Form */}
          {showAgentVerify && (
            <div className="login-form-container">
              <form onSubmit={handleVerifyAgent} className="banking-login-form">
                <h3 style={{ margin: '0 0 8px', fontSize: '18px', color: '#0f172a' }}>Verify an Agent</h3>
                <p className="reset-info">Enter the Agent ID to verify their identity and credentials.</p>
                
                <div className="form-group">
                  <label>Agent ID</label>
                  <input
                    type="text"
                    value={agentId}
                    onChange={(e) => setAgentId(e.target.value.toUpperCase())}
                    placeholder="e.g. AGT-A1B2C3D4"
                    required
                  />
                </div>

                <button type="submit" className="banking-btn-primary" disabled={verifyingAgent}>
                  {verifyingAgent ? (
                    <span className="btn-spinner"></span>
                  ) : (
                    <>
                      <SearchIcon size={18} />
                      Verify Agent
                    </>
                  )}
                </button>

                <button type="button" className="banking-btn-text" onClick={() => { setShowAgentVerify(false); setAgentResult(null); setAgentId(''); }}>
                  <ArrowLeftIcon size={16} /> Back to Login
                </button>
              </form>

              {/* Agent Verification Result */}
              {agentResult && (
                <div className={`agent-result ${agentResult.verified ? 'verified' : 'not-verified'}`}>
                  {agentResult.verified ? (
                    <>
                      <div className="agent-result-icon verified"><CheckCircleIcon size={28} /></div>
                      <h4>Agent Verified</h4>
                      <div className="agent-info">
                        <div className="agent-info-row">
                          <span className="agent-label">Name:</span>
                          <span className="agent-value">{agentResult.agent.full_name}</span>
                        </div>
                        <div className="agent-info-row">
                          <span className="agent-label">Agent ID:</span>
                          <span className="agent-value agent-id">{agentResult.agent.agent_id}</span>
                        </div>
                        <div className="agent-info-row">
                          <span className="agent-label">Designation:</span>
                          <span className="agent-value">{agentResult.agent.designation}</span>
                        </div>
                        {agentResult.agent.department && (
                          <div className="agent-info-row">
                            <span className="agent-label">Department:</span>
                            <span className="agent-value">{agentResult.agent.department}</span>
                          </div>
                        )}
                      </div>
                      <p className="agent-verified-text">This agent is verified and authorized.</p>
                    </>
                  ) : (
                    <>
                      <div className="agent-result-icon not-verified"><XCircleIcon size={28} /></div>
                      <h4>Not Verified</h4>
                      <p className="agent-not-verified-text">{agentResult.message}</p>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Fraud Victim Assistance Section */}
      <div className="fraud-assistance-section">
        <div className="fraud-assistance-card">
          <div className="fraud-assistance-content">
            <span className="fraud-section-label">FRAUD VICTIM ASSISTANCE</span>
            <h2 className="fraud-section-title">Dedicated recovery support for verified victims</h2>
            <p className="fraud-section-desc">
              The Fraud Victim Assistance Program is built exclusively for
              individuals who have suffered confirmed financial fraud or identity theft. Our
              Recovery Specialists coordinate fund tracing, Safe Custody account
              management, and secure document handling on your behalf.
            </p>
            <ul className="fraud-section-list">
              <li>Case status, wire recovery, and specialist contact in one secure workspace</li>
              <li>FDIC Safe Custody segregation for recovered and in-transit funds</li>
              <li>Encrypted messaging and shipment tracking for evidence and replacement cards</li>
            </ul>
          </div>
          <div className="fraud-assistance-image">
            <div className="fraud-help-card">
              <span className="fraud-help-title">Help for Victims</span>
              <div className="fraud-help-overlay"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Restricted Access Section */}
      <div className="restricted-access-section">
        <div className="restricted-access-card">
          <div className="restricted-access-image">
            <div className="restricted-illustration">
              <svg viewBox="0 0 400 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="20" y="60" width="60" height="140" rx="4" fill="rgba(255,255,255,0.15)"/>
                <rect x="90" y="40" width="50" height="160" rx="4" fill="rgba(255,255,255,0.12)"/>
                <rect x="150" y="20" width="70" height="180" rx="4" fill="rgba(255,255,255,0.18)"/>
                <rect x="230" y="50" width="55" height="150" rx="4" fill="rgba(255,255,255,0.12)"/>
                <rect x="295" y="30" width="65" height="170" rx="4" fill="rgba(255,255,255,0.15)"/>
                <rect x="10" y="180" width="380" height="20" rx="2" fill="rgba(255,255,255,0.08)"/>
              </svg>
              <div className="restricted-people">
                {[...Array(12)].map((_, i) => (
                  <div key={i} className="person-silhouette">
                    <div className="person-head"></div>
                    <div className="person-body"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="restricted-access-content">
            <span className="restricted-section-label">RESTRICTED ACCESS</span>
            <h2 className="restricted-section-title">Not open to the general public</h2>
            <p className="restricted-section-desc">
              This is <strong>not</strong> a retail banking login and <strong>not</strong> available for walk-
              in customers, new account opening, or self-service
              enrollment. You cannot create credentials here. Every User
              ID is issued only after verified fraud intake and case
              assignment.
            </p>
            <div className="restricted-warning-box">
              <p>No public registration. Unauthorized access attempts are
              logged and may be referred for federal review. If you are not
              an enrolled fraud victim, do not use this portal.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="banking-footer">
        <div className="footer-content">
          <div className="footer-left">
            <span className="footer-logo">FDIC</span>
            <p>Federal Deposit Insurance Corporation</p>
          </div>
          <div className="footer-links">
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Service</a>
            <a href="#">Contact Us</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ClientLogin;
