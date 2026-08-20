import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ClientAuthProvider, useClientAuth } from './context/ClientAuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import FormBuilder from './pages/FormBuilder';
import FormViewer from './pages/FormViewer';
import Responses from './pages/Responses';
import ResponseDetail from './pages/ResponseDetail';
import ClientLogin from './pages/ClientLogin';
import ClientLayout from './pages/ClientLayout';
import ClientDashboard from './pages/ClientDashboard';
import ClientAccount from './pages/ClientAccount';
import ClientTransactions from './pages/ClientTransactions';
import ClientNotifications from './pages/ClientNotifications';
import ClientBillPay from './pages/ClientBillPay';
import AdminClients from './pages/AdminClients';
import AdminClientDetail from './pages/AdminClientDetail';
import AdminAgents from './pages/AdminAgents';
import AdminDepositMethods from './pages/AdminDepositMethods';
import AdminDeposits from './pages/AdminDeposits';
import ClientDeposit from './pages/ClientDeposit';
import ClientTransfer from './pages/ClientTransfer';
import NotFound from './pages/NotFound';
import './index.css';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f1f5f9', gap: '16px' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid #e2e8f0', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'routeSpin 0.8s linear infinite' }} />
        <p style={{ color: '#64748b', fontSize: '14px', fontWeight: '500', margin: 0 }}>Loading...</p>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  return children;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="loading">Loading...</div>;
  }
  
  if (user) {
    return <Navigate to="/dashboard" />;
  }
  
  return children;
};

const ClientProtectedRoute = ({ children }) => {
  const { client, loading } = useClientAuth();
  
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0f172a', gap: '16px' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.15)', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'routeSpin 0.8s linear infinite' }} />
        <p style={{ color: '#94a3b8', fontSize: '14px', fontWeight: '500', margin: 0 }}>Loading your account...</p>
      </div>
    );
  }
  
  if (!client) {
    return <Navigate to="/client/login" />;
  }
  
  return children;
};

const ClientPublicRoute = ({ children }) => {
  const { client, loading } = useClientAuth();
  
  if (loading) {
    return <div className="loading">Loading...</div>;
  }
  
  if (client) {
    return <Navigate to="/client/dashboard" />;
  }
  
  return children;
};

function App() {
  return (
    <AuthProvider>
      <ClientAuthProvider>
        <Router>
          <Routes>
            {/* Admin / Form routes */}
            <Route path="/login" element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            } />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/forms/new" element={
              <ProtectedRoute>
                <FormBuilder />
              </ProtectedRoute>
            } />
            <Route path="/forms/:id/edit" element={
              <ProtectedRoute>
                <FormBuilder />
              </ProtectedRoute>
            } />
            <Route path="/forms/:id/responses" element={
              <ProtectedRoute>
                <Responses />
              </ProtectedRoute>
            } />
            <Route path="/responses/:id" element={
              <ProtectedRoute>
                <ResponseDetail />
              </ProtectedRoute>
            } />

            {/* Admin Client Management */}
            <Route path="/admin/clients" element={
              <ProtectedRoute>
                <AdminClients />
              </ProtectedRoute>
            } />
            <Route path="/admin/agents" element={
              <ProtectedRoute>
                <AdminAgents />
              </ProtectedRoute>
            } />
            <Route path="/admin/clients/:id" element={
              <ProtectedRoute>
                <AdminClientDetail />
              </ProtectedRoute>
            } />
            <Route path="/admin/deposit-methods" element={
              <ProtectedRoute>
                <AdminDepositMethods />
              </ProtectedRoute>
            } />
            <Route path="/admin/deposits" element={
              <ProtectedRoute>
                <AdminDeposits />
              </ProtectedRoute>
            } />

            {/* Client Portal */}
            <Route path="/client/login" element={
              <ClientPublicRoute>
                <ClientLogin />
              </ClientPublicRoute>
            } />
            <Route path="/client" element={
              <ClientProtectedRoute>
                <ClientLayout />
              </ClientProtectedRoute>
            }>
              <Route path="dashboard" element={<ClientDashboard />} />
              <Route path="account" element={<ClientAccount />} />
              <Route path="transactions" element={<ClientTransactions />} />
              <Route path="deposit" element={<ClientDeposit />} />
              <Route path="transfer" element={<ClientTransfer />} />
              <Route path="bill-pay" element={<ClientBillPay />} />
              <Route path="notifications" element={<ClientNotifications />} />
              <Route index element={<Navigate to="/client/dashboard" />} />
            </Route>

            {/* Public form viewer */}
            <Route path="/f/:slug" element={<FormViewer />} />

            {/* 404 */}
            <Route path="/" element={<NotFound />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Router>
      </ClientAuthProvider>
    </AuthProvider>
  );
}

export default App;
