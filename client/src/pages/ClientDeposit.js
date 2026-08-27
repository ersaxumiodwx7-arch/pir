import React, { useState, useEffect } from 'react';
import { clientPortalAPI } from '../services/api';
import { CreditCardIcon, AlertCircleIcon, CheckCircleIcon, ClockIcon, FileTextIcon, ArrowLeftIcon } from '../components/Icons';
import toast from 'react-hot-toast';
import './ClientPages.css';

const logoMap = {
  apple_pay: '/payment-logos/apple-pay.png',
  venmo: '/payment-logos/venmo.png',
  cashapp: '/payment-logos/cashapp.png',
  zelle: '/payment-logos/zelle.png',
};

const carrierLogos = {
  fedex: { name: 'FedEx', color: '#4d148c', accent: '#ff6600', image: '/carrier-logos/fedex.png' },
  ups: { name: 'UPS', color: '#351c15', accent: '#ffb500', image: '/carrier-logos/ups.png' },
  usps: { name: 'USPS', color: '#004b87', accent: '#da291c', image: null },
  dhl: { name: 'DHL', color: '#d40511', accent: '#ffcc00', image: null },
  uber: { name: 'Uber', color: '#000000', accent: '#06c167', image: '/carrier-logos/uber.png' },
  fdic: { name: 'FDIC Courier', color: '#003366', accent: '#4a90d9', image: '/carrier-logos/fdic-courier.png' },
  other: { name: 'Pickup', color: '#6366f1', accent: '#818cf8', image: null },
};

const cryptoLogos = {
  btc: { name: 'Bitcoin', color: '#f7931a', symbol: '₿' },
  eth: { name: 'Ethereum', color: '#627eea', symbol: 'Ξ' },
  sol: { name: 'Solana', color: '#9945ff', symbol: '◎' },
  usdt: { name: 'Tether', color: '#26a17b', symbol: '₮' },
  usdc: { name: 'USD Coin', color: '#2775ca', symbol: '$' },
  doge: { name: 'Dogecoin', color: '#c2a633', symbol: 'Ð' },
  ltc: { name: 'Litecoin', color: '#bfbbbb', symbol: 'Ł' },
  bnb: { name: 'BNB', color: '#f0b90b', symbol: '◆' },
  xrp: { name: 'XRP', color: '#00aae4', symbol: '✕' },
  matic: { name: 'Polygon', color: '#8247e5', symbol: '⬡' },
};

const CryptoLogo = ({ cryptoType, size = 48 }) => {
  const crypto = cryptoLogos[cryptoType];
  if (!crypto) return null;
  return (
    <div style={{
      width: size, height: size, borderRadius: 12,
      background: `linear-gradient(135deg, ${crypto.color}22, ${crypto.color}44)`,
      border: `2px solid ${crypto.color}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.45, color: crypto.color, fontWeight: 'bold'
    }}>
      {crypto.symbol}
    </div>
  );
};

const CarrierLogo = ({ carrier, size = 48 }) => {
  const c = carrierLogos[carrier] || carrierLogos.other;
  if (c.image) {
    return (
      <div style={{
        width: size, height: size, borderRadius: 10,
        background: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: '1px solid #e2e8f0', overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
      }}>
        <img src={c.image} alt={c.name} style={{ width: '80%', height: '80%', objectFit: 'contain' }} />
      </div>
    );
  }
  const fontSize = size * 0.28;
  return (
    <div style={{
      width: size, height: size, borderRadius: 10,
      background: c.color,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: 800, fontSize,
      letterSpacing: '-0.5px', textTransform: 'uppercase',
      boxShadow: `0 2px 8px ${c.color}44`
    }}>
      {c.name}
    </div>
  );
};

const MethodLogo = ({ methodType, cryptoType, pickupCarrier, size = 48 }) => {
  if (methodType === 'crypto' && cryptoType) {
    return <CryptoLogo cryptoType={cryptoType} size={size} />;
  }
  if (methodType === 'pickup') {
    return <CarrierLogo carrier={pickupCarrier} size={size} />;
  }
  const src = logoMap[methodType];
  if (src) {
    return <img src={src} alt={methodType} style={{ width: size, height: size, borderRadius: 10, objectFit: 'cover' }} />;
  }
  // Fallback SVGs for non-brand methods
  const fallbacks = {
    pickup: (
      <svg width={size} height={size} viewBox="0 0 48 48">
        <rect width="48" height="48" rx="10" fill="#4d148c"/>
        <path d="M10 30h4l2-8h16l2 8h4" stroke="#fff" strokeWidth="2" fill="none"/>
        <rect x="16" y="22" width="14" height="12" rx="1" fill="#fff" opacity="0.9"/>
        <circle cx="16" cy="34" r="3" fill="#fff"/>
        <circle cx="30" cy="34" r="3" fill="#fff"/>
        <path d="M36 30h4l1-2h-4z" fill="#fff" opacity="0.8"/>
      </svg>
    ),
    wire_transfer: (
      <svg width={size} height={size} viewBox="0 0 48 48">
        <rect width="48" height="48" rx="10" fill="#1a1a2e"/>
        <path d="M14 34V18l10-6 10 6v16" stroke="#4fc3f7" strokeWidth="2" fill="none"/>
        <path d="M18 34v-8h12v8" stroke="#4fc3f7" strokeWidth="2" fill="none"/>
        <circle cx="24" cy="22" r="2" fill="#4fc3f7"/>
      </svg>
    ),
    bank_deposit: (
      <svg width={size} height={size} viewBox="0 0 48 48">
        <rect width="48" height="48" rx="10" fill="#0d47a1"/>
        <path d="M24 10L8 20h32L24 10z" fill="#fff"/>
        <rect x="12" y="22" width="4" height="10" fill="#fff"/>
        <rect x="22" y="22" width="4" height="10" fill="#fff"/>
        <rect x="32" y="22" width="4" height="10" fill="#fff"/>
        <rect x="8" y="34" width="32" height="3" fill="#fff"/>
      </svg>
    ),
    shipment: (
      <svg width={size} height={size} viewBox="0 0 48 48">
        <rect width="48" height="48" rx="10" fill="#ff8f00"/>
        <rect x="12" y="18" width="20" height="14" rx="2" fill="#fff"/>
        <path d="M32 22h4l4 6v4h-8v-10z" fill="#fff"/>
        <circle cx="18" cy="34" r="3" fill="#fff"/>
        <circle cx="36" cy="34" r="3" fill="#fff"/>
      </svg>
    ),
    check: (
      <svg width={size} height={size} viewBox="0 0 48 48">
        <rect width="48" height="48" rx="10" fill="#2e7d32"/>
        <rect x="12" y="12" width="24" height="24" rx="2" fill="#fff"/>
        <path d="M18 24l4 4 8-8" stroke="#2e7d32" strokeWidth="2.5" fill="none"/>
      </svg>
    ),
    other: (
      <svg width={size} height={size} viewBox="0 0 48 48">
        <rect width="48" height="48" rx="10" fill="#546e7a"/>
        <circle cx="24" cy="24" r="4" fill="#fff"/>
        <circle cx="16" cy="24" r="4" fill="#fff"/>
        <circle cx="32" cy="24" r="4" fill="#fff"/>
      </svg>
    )
  };
  return fallbacks[methodType] || fallbacks.other; // crypto handled above
};

const formatMethodType = (type, cryptoType) => {
  const labels = {
    apple_pay: 'Apple Pay',
    venmo: 'Venmo',
    cashapp: 'Cash App',
    zelle: 'Zelle',
    wire_transfer: 'Wire Transfer',
    bank_deposit: 'Bank Deposit',
    shipment: 'Shipment / Physical',
    check: 'Check',
    other: 'Other',
    crypto: cryptoType ? cryptoLogos[cryptoType]?.name || 'Crypto' : 'Crypto',
    pickup: 'Pickup'
  };
  return labels[type] || type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
};

const CopyButton = ({ text }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy');
    }
  };

  return (
    <button type="button" className="copy-tap-btn" onClick={handleCopy} title="Tap to copy">
      {copied ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
      )}
    </button>
  );
};

const ClientDeposit = () => {
  const [methods, setMethods] = useState([]);
  const [deposits, setDeposits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    reference_number: '',
    tracking_number: '',
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [methodsRes, depositsRes] = await Promise.all([
        clientPortalAPI.getDepositMethods(),
        clientPortalAPI.getMyDeposits()
      ]);
      setMethods(methodsRes.data.methods || []);
      setDeposits(depositsRes.data.deposits || []);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load deposit information');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectMethod = (method) => {
    setSelectedMethod(method);
    setShowForm(true);
    setFormData({ reference_number: '', tracking_number: '', notes: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSubmitting(true);
      setError('');
      const submitData = new FormData();
      submitData.append('deposit_method_id', selectedMethod.id);
      submitData.append('amount', parseFloat(selectedMethod.deposit_amount || 0));
      if (formData.reference_number) submitData.append('reference_number', formData.reference_number);
      if (formData.tracking_number) submitData.append('tracking_number', formData.tracking_number);
      if (formData.notes) submitData.append('notes', formData.notes);

      await clientPortalAPI.submitDeposit(submitData);
      setSuccess('Deposit request submitted successfully!');
      setShowForm(false);
      setSelectedMethod(null);
      fetchData();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      console.error('Error submitting deposit:', err);
      setError(err.response?.data?.error || 'Failed to submit deposit');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'available':
        return <span className="status-badge status-available"><CheckCircleIcon size={12} /> Available</span>;
      case 'processing':
        return <span className="status-badge status-processing"><ClockIcon size={12} /> Processing</span>;
      case 'received':
        return <span className="status-badge status-received"><CheckCircleIcon size={12} /> Received</span>;
      case 'pending':
        return <span className="status-badge status-pending"><ClockIcon size={12} /> Pending</span>;
      case 'rejected':
      case 'cancelled':
        return <span className="status-badge status-failed"><AlertCircleIcon size={12} /> {status.charAt(0).toUpperCase() + status.slice(1)}</span>;
      default:
        return <span className="status-badge">{status}</span>;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="client-pages-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading deposit information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="client-pages-container">
      <div className="client-pages-header">
        <h1>Add Funds</h1>
      </div>

      {error && (
        <div className="error-message">
          <AlertCircleIcon size={16} />
          {error}
          <button onClick={() => setError('')}>Dismiss</button>
        </div>
      )}

      {success && (
        <div className="success-message">
          <CheckCircleIcon size={16} />
          {success}
        </div>
      )}

      {!showForm ? (
        <>
          <div className="deposit-methods-grid">
            {methods.length === 0 ? (
              <div className="empty-state">
                <CreditCardIcon size={48} />
                <h3>No Deposit Methods Available</h3>
                <p>Please contact your administrator to set up deposit methods.</p>
              </div>
            ) : (
              methods.map(method => (
                <div 
                  key={method.id} 
                  className="deposit-method-card"
                  onClick={() => handleSelectMethod(method)}
                >
                  <div className="method-icon">
                    <MethodLogo methodType={method.method_type} cryptoType={method.crypto_type} pickupCarrier={method.pickup_carrier} size={48} />
                  </div>
                  <h3>{method.method_name}</h3>
                  <p className="method-type-label">{formatMethodType(method.method_type, method.crypto_type)}</p>
                  {method.deposit_amount && (
                    <p className="method-amount">${parseFloat(method.deposit_amount).toFixed(2)}</p>
                  )}
                  <p className="method-description">{method.instructions?.substring(0, 100)}...</p>
                  <button className="btn-select-method">
                    Select Method
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="deposit-history">
            <h2>Deposit History</h2>
            {deposits.length === 0 ? (
              <div className="empty-state">
                <FileTextIcon size={32} />
                <p>No deposit history</p>
              </div>
            ) : (
              <div className="deposits-table">
                <table>
                  <thead>
                    <tr>
                      <th>Amount</th>
                      <th>Method</th>
                      <th>Reference</th>
                      <th>Status</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deposits.map(deposit => (
                      <tr key={deposit.id}>
                        <td data-label="Amount"><strong>${parseFloat(deposit.amount).toFixed(2)}</strong></td>
                        <td data-label="Method">{deposit.method_name}</td>
                        <td data-label="Reference">{deposit.reference_number || 'N/A'}</td>
                        <td data-label="Status">{getStatusBadge(deposit.status)}</td>
                        <td data-label="Date">{formatDate(deposit.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="deposit-form-container">
          <button className="back-btn" onClick={() => { setShowForm(false); setSelectedMethod(null); }}>
            <ArrowLeftIcon size={16} /> Back to Methods
          </button>

          <div className="selected-method-info">
            <h2>{selectedMethod?.method_name}</h2>
            <p className="method-type">{formatMethodType(selectedMethod?.method_type, selectedMethod?.crypto_type)}{selectedMethod?.method_type === 'pickup' && selectedMethod?.pickup_carrier ? ` — ${(carrierLogos[selectedMethod.pickup_carrier] || carrierLogos.other).name}` : ''}</p>
          </div>

          <div className="payment-instructions">
            <h3>Payment Instructions</h3>
            <div className="instructions-content">
              {selectedMethod?.recipient_name && (
                <div className="copy-row">
                  <span className="copy-label"><strong>Recipient:</strong></span>
                  <span className="copy-value">{selectedMethod.recipient_name}</span>
                  <CopyButton text={selectedMethod.recipient_name} />
                </div>
              )}

              {/* Wire Transfer / Bank Deposit - Bank details */}
              {(selectedMethod?.method_type === 'wire_transfer' || selectedMethod?.method_type === 'bank_deposit') && (
                <>
                  {selectedMethod?.bank_name && (
                    <div className="copy-row">
                      <span className="copy-label"><strong>Bank Name:</strong></span>
                      <span className="copy-value">{selectedMethod.bank_name}</span>
                      <CopyButton text={selectedMethod.bank_name} />
                    </div>
                  )}
                  {selectedMethod?.account_number && (
                    <div className="copy-row">
                      <span className="copy-label"><strong>Account Number:</strong></span>
                      <span className="copy-value account-detail-value">{selectedMethod.account_number}</span>
                      <CopyButton text={selectedMethod.account_number} />
                    </div>
                  )}
                  {selectedMethod?.routing_number && (
                    <div className="copy-row">
                      <span className="copy-label"><strong>Routing Number:</strong></span>
                      <span className="copy-value account-detail-value">{selectedMethod.routing_number}</span>
                      <CopyButton text={selectedMethod.routing_number} />
                    </div>
                  )}
                </>
              )}

              {/* Bank Deposit - Nearest branch map link */}
              {selectedMethod?.method_type === 'bank_deposit' && selectedMethod?.nearest_branch_map_link && (
                <div className="map-link-section">
                  <strong>Nearest Branch:</strong>
                  <a 
                    href={selectedMethod.nearest_branch_map_link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="map-link"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    View Nearest Branch on Map
                  </a>
                </div>
              )}

              {/* Shipment - Nearest drop-off location map link */}
              {selectedMethod?.method_type === 'shipment' && selectedMethod?.nearest_branch_map_link && (
                <div className="map-link-section">
                  <strong>Nearest Drop-off Location:</strong>
                  <a 
                    href={selectedMethod.nearest_branch_map_link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="map-link"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    View Nearest Drop-off Location on Map
                  </a>
                </div>
              )}

              {/* Zelle/CashApp/Venmo - Payment address */}
              {(selectedMethod?.method_type === 'zelle' || selectedMethod?.method_type === 'cashapp' || selectedMethod?.method_type === 'apple_pay' || selectedMethod?.method_type === 'venmo') && selectedMethod?.payment_address && (
                <div className="copy-row">
                  <span className="copy-label"><strong>Payment Address:</strong></span>
                  <span className="copy-value account-detail-value">{selectedMethod.payment_address}</span>
                  <CopyButton text={selectedMethod.payment_address} />
                </div>
              )}

              {/* Pickup - FedEx-style Tracking Display */}
              {selectedMethod?.method_type === 'pickup' && (() => {
                const carrier = carrierLogos[selectedMethod.pickup_carrier] || carrierLogos.other;
                const scheduledDate = selectedMethod.pickup_scheduled_date
                  ? new Date(selectedMethod.pickup_scheduled_date).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })
                  : null;
                return (
                  <div className="pickup-tracking-card">
                    <div className="pickup-tracking-header" style={{ background: carrier.color }}>
                      <span className="pickup-tracking-label">PACKAGE PICKUP</span>
                      <h3 className="pickup-tracking-title" style={{ color: '#fff' }}>{carrier.name} Pickup Status</h3>
                      <p className="pickup-tracking-subtitle" style={{ color: 'rgba(255,255,255,0.8)' }}>
                        Pickup details for your insured parcel. This pickup is scheduled through our secure FDIC-linked portal.
                      </p>
                    </div>
                    <div className="pickup-tracking-body">
                      <div className="pickup-carrier-badge">
                        {carrier.image ? (
                          <img src={carrier.image} alt={carrier.name} style={{ height: '28px', width: '28px', objectFit: 'contain' }} />
                        ) : (
                          <span style={{ color: carrier.color, fontWeight: 800, fontSize: '18px', letterSpacing: '-0.5px' }}>{carrier.name}</span>
                        )}
                      </div>
                      {selectedMethod?.insured_value && (
                        <div className="pickup-info-row">
                          <span className="pickup-info-label">Insured Value</span>
                          <span className="pickup-info-value pickup-insured-value">${parseFloat(selectedMethod.insured_value).toLocaleString('en-US', { minimumFractionDigits: 2 })} USD</span>
                        </div>
                      )}
                      {scheduledDate && (
                        <div className="pickup-info-row">
                          <span className="pickup-info-label">Scheduled Pickup</span>
                          <span className="pickup-info-value pickup-scheduled-value">{scheduledDate}</span>
                          <span className="pickup-info-sub">before end of day</span>
                        </div>
                      )}
                      {/* Tracking Status */}
                      <div className="pickup-tracking-status-section">
                        <div className="pickup-info-row">
                          <span className="pickup-info-label">Delivery Status</span>
                          <span className={`pickup-info-value pickup-status-value pickup-status-${selectedMethod?.pickup_status || 'scheduled'}`}>
                            {selectedMethod?.pickup_status === 'on_the_way' && 'Your picker is on the way'}
                            {selectedMethod?.pickup_status === 'picked' && 'Parcel has been picked up'}
                            {selectedMethod?.pickup_status === 'secured' && 'Your account is secured'}
                            {(!selectedMethod?.pickup_status || selectedMethod?.pickup_status === 'scheduled') && 'Your package is ready for pickup'}
                          </span>
                        </div>
                        {selectedMethod?.estimated_arrival && (
                          <div className="pickup-info-row">
                            <span className="pickup-info-label">Estimated Arrival</span>
                            <span className="pickup-info-value pickup-eta-value">{selectedMethod.estimated_arrival}</span>
                          </div>
                        )}
                      </div>

                      {/* Picker / Driver Info - Always shown for pickup methods */}
                      <div className="pickup-picker-section">
                        <div className="pickup-picker-header">YOUR PICKER</div>
                        <div className="pickup-picker-info">
                          {selectedMethod?.picker_image ? (
                            <div className="pickup-picker-avatar">
                              <img src={selectedMethod.picker_image} alt={selectedMethod.picker_name || 'Picker'} />
                            </div>
                          ) : (
                            <div className="pickup-picker-avatar pickup-picker-avatar-placeholder">
                              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                            </div>
                          )}
                          <div className="pickup-picker-details">
                            <div className="pickup-picker-name">{selectedMethod?.picker_name || 'Awaiting assignment'}</div>
                            <div className="pickup-car-info">
                              <span className="pickup-car-icon">🚗</span>
                              <span>{selectedMethod?.car_name || 'Vehicle details pending'}</span>
                              {selectedMethod?.car_number && <span className="pickup-car-plate">{selectedMethod.car_number}</span>}
                            </div>
                          </div>
                        </div>
                      </div>

                      {selectedMethod?.recipient_name && (
                        <div className="pickup-info-row">
                          <span className="pickup-info-label">Recipient</span>
                          <span className="pickup-info-value">{selectedMethod.recipient_name}</span>
                        </div>
                      )}
                      {selectedMethod?.recipient_address && (
                        <div className="pickup-info-row">
                          <span className="pickup-info-label">Recipient Address</span>
                          <span className="pickup-info-value pickup-location-value">{selectedMethod.recipient_address}</span>
                        </div>
                      )}
                      {selectedMethod?.pickup_location && (
                        <div className="pickup-info-row">
                          <span className="pickup-info-label">Pickup Location</span>
                          <span className="pickup-info-value pickup-location-value">{selectedMethod.pickup_location}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Crypto - QR Code + Wallet Address */}
              {selectedMethod?.method_type === 'crypto' && (
                <>
                  {selectedMethod?.qr_image_url && (
                    <div style={{ textAlign: 'center', padding: '16px 0' }}>
                      <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '8px', fontWeight: 500 }}>Scan QR Code to Pay</p>
                      <img 
                        src={selectedMethod.qr_image_url} 
                        alt={`${formatMethodType('crypto', selectedMethod.crypto_type)} QR Code`}
                        style={{ width: '200px', height: '200px', borderRadius: '12px', border: '2px solid #e2e8f0', padding: '8px', background: '#fff' }}
                      />
                    </div>
                  )}
                  {selectedMethod?.wallet_address && (
                    <div style={{ marginTop: '12px' }}>
                      <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '6px', fontWeight: 500 }}>
                        {formatMethodType('crypto', selectedMethod.crypto_type)} Wallet Address
                      </p>
                      <div className="copy-row" style={{ background: '#f8fafc', borderRadius: '8px', padding: '10px 12px', border: '1px solid #e2e8f0' }}>
                        <span className="copy-value account-detail-value" style={{ fontFamily: 'monospace', fontSize: '13px', wordBreak: 'break-all' }}>{selectedMethod.wallet_address}</span>
                        <CopyButton text={selectedMethod.wallet_address} />
                      </div>
                    </div>
                  )}
                </>
              )}

              {selectedMethod?.instructions && (
                <div className="instructions-text">
                  <strong>Instructions:</strong>
                  <p>{selectedMethod.instructions}</p>
                </div>
              )}
              {selectedMethod?.additional_notes && (
                <p className="additional-notes"><strong>Note:</strong> {selectedMethod.additional_notes}</p>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="deposit-form">
            <div className="form-group">
              <label>Deposit Amount</label>
              <div className="fixed-amount">${parseFloat(selectedMethod?.deposit_amount || 0).toFixed(2)}</div>
            </div>

            {selectedMethod?.method_type === 'shipment' && (
              <div className="form-group">
                <label>Tracking Number (optional)</label>
                <input
                  type="text"
                  value={formData.tracking_number}
                  onChange={(e) => setFormData({...formData, tracking_number: e.target.value})}
                  placeholder="Shipment tracking number"
                />
              </div>
            )}

            <button 
              type="submit" 
              className="btn-submit-deposit"
              disabled={submitting}
            >
              {submitting ? 'Submitting...' : 'Submit Deposit Request'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default ClientDeposit;