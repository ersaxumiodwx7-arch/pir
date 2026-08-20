import React, { createContext, useContext, useState, useEffect } from 'react';
import { clientPortalAPI } from '../services/api';

const ClientAuthContext = createContext(null);

export const ClientAuthProvider = ({ children }) => {
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('client_token');
    const clientData = localStorage.getItem('client_data');
    
    if (token && clientData) {
      setClient(JSON.parse(clientData));
    }
    setLoading(false);
  }, []);

  const login = async (caseId, password) => {
    try {
      const response = await clientPortalAPI.login(caseId, password);
      const { token, client: clientData } = response.data;
      
      localStorage.setItem('client_token', token);
      localStorage.setItem('client_data', JSON.stringify(clientData));
      setClient(clientData);
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Login failed' 
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('client_token');
    localStorage.removeItem('client_data');
    setClient(null);
  };

  return (
    <ClientAuthContext.Provider value={{ client, login, logout, loading }}>
      {children}
    </ClientAuthContext.Provider>
  );
};

export const useClientAuth = () => {
  const context = useContext(ClientAuthContext);
  if (!context) {
    throw new Error('useClientAuth must be used within a ClientAuthProvider');
  }
  return context;
};
