-- Client Portal Schema
-- Run after the existing form schema

-- Client accounts
CREATE TABLE IF NOT EXISTS clients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  case_id VARCHAR(20) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(50),
  account_status VARCHAR(20) DEFAULT 'active',
  balance DECIMAL(15,2) DEFAULT 0.00,
  display_balance DECIMAL(15,2) DEFAULT 0.00,
  avatar_url VARCHAR(500),
  address TEXT,
  date_of_birth VARCHAR(20),
  ssn_last4 VARCHAR(4),
  account_type VARCHAR(50) DEFAULT 'standard',
  account_number VARCHAR(50),
  routing_number VARCHAR(50),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login_at DATETIME,
  created_by INTEGER
);

-- Client transactions
CREATE TABLE IF NOT EXISTS client_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL,
  transaction_id VARCHAR(30) UNIQUE NOT NULL,
  description TEXT NOT NULL,
  credit_amount DECIMAL(15,2) DEFAULT 0.00,
  debit_amount DECIMAL(15,2) DEFAULT 0.00,
  balance_after DECIMAL(15,2) DEFAULT 0.00,
  status VARCHAR(20) DEFAULT 'completed',
  category VARCHAR(50),
  reference VARCHAR(100),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

-- Client documents
CREATE TABLE IF NOT EXISTS client_documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL,
  document_name VARCHAR(255) NOT NULL,
  document_type VARCHAR(50),
  file_path VARCHAR(500),
  file_size INTEGER,
  status VARCHAR(20) DEFAULT 'active',
  description TEXT,
  uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  uploaded_by INTEGER,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

-- Client notifications/messages
CREATE TABLE IF NOT EXISTS client_notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  notification_type VARCHAR(50) DEFAULT 'message',
  priority VARCHAR(20) DEFAULT 'normal',
  is_read INTEGER DEFAULT 0,
  read_at DATETIME,
  link_url VARCHAR(500),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

-- Client activity logs
CREATE TABLE IF NOT EXISTS client_activity_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL,
  action VARCHAR(100) NOT NULL,
  description TEXT,
  ip_address VARCHAR(50),
  user_agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

-- Client session tokens (for tracking active sessions)
CREATE TABLE IF NOT EXISTS client_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  ip_address VARCHAR(50),
  user_agent TEXT,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

-- Password reset tokens
CREATE TABLE IF NOT EXISTS client_password_resets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL,
  token VARCHAR(255) NOT NULL,
  expires_at DATETIME NOT NULL,
  used INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

-- Bill payments
CREATE TABLE IF NOT EXISTS client_bill_payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL,
  biller_name VARCHAR(255) NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  account_reference VARCHAR(100),
  payment_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'processing',
  transaction_id VARCHAR(30),
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

-- Agent verification
CREATE TABLE IF NOT EXISTS agents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id VARCHAR(50) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  designation VARCHAR(255) NOT NULL,
  department VARCHAR(255),
  phone VARCHAR(50),
  email VARCHAR(255),
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER
);

-- Deposit Methods (admin-configured payment methods - global)
CREATE TABLE IF NOT EXISTS deposit_methods (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  method_name VARCHAR(100) NOT NULL,
  method_type VARCHAR(50) NOT NULL,
  instructions TEXT,
  recipient_name VARCHAR(255),
  account_details VARCHAR(500),
  payment_address VARCHAR(500),
  additional_notes TEXT,
  deposit_amount DECIMAL(15,2) DEFAULT 0,
  crypto_type VARCHAR(20),
  wallet_address VARCHAR(500),
  qr_image_url VARCHAR(500),
  pickup_carrier VARCHAR(50),
  pickup_location VARCHAR(500),
  pickup_scheduled_date VARCHAR(50),
  insured_value DECIMAL(15,2),
  pickup_status VARCHAR(50) DEFAULT 'scheduled',
  picker_name VARCHAR(255),
  picker_image VARCHAR(500),
  car_name VARCHAR(255),
  car_number VARCHAR(50),
  estimated_arrival VARCHAR(100),
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER
);

-- Client Deposit Methods (per-client payment methods set by admin)
CREATE TABLE IF NOT EXISTS client_deposit_methods (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL,
  method_name VARCHAR(100) NOT NULL,
  method_type VARCHAR(50) NOT NULL,
  instructions TEXT,
  recipient_name VARCHAR(255),
  bank_name VARCHAR(255),
  account_number VARCHAR(100),
  routing_number VARCHAR(100),
  payment_address VARCHAR(500),
  nearest_branch_map_link VARCHAR(1000),
  additional_notes TEXT,
  deposit_amount DECIMAL(15,2) DEFAULT 0,
  crypto_type VARCHAR(20),
  wallet_address VARCHAR(500),
  qr_image_url VARCHAR(500),
  pickup_carrier VARCHAR(50),
  pickup_location VARCHAR(500),
  pickup_scheduled_date VARCHAR(50),
  insured_value DECIMAL(15,2),
  pickup_status VARCHAR(50) DEFAULT 'scheduled',
  picker_name VARCHAR(255),
  picker_image VARCHAR(500),
  car_name VARCHAR(255),
  car_number VARCHAR(50),
  estimated_arrival VARCHAR(100),
  is_active INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

-- Deposit Requests (client-submitted deposits)
CREATE TABLE IF NOT EXISTS deposit_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL,
  deposit_method_id INTEGER NOT NULL,
  client_deposit_method_id INTEGER,
  amount DECIMAL(15,2) NOT NULL,
  reference_number VARCHAR(100),
  tracking_number VARCHAR(100),
  notes TEXT,
  payment_proof_url VARCHAR(500),
  status VARCHAR(20) DEFAULT 'pending',
  transaction_id VARCHAR(30),
  admin_notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  FOREIGN KEY (deposit_method_id) REFERENCES deposit_methods(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_clients_case_id ON clients(case_id);
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
CREATE INDEX IF NOT EXISTS idx_client_transactions_client_id ON client_transactions(client_id);
CREATE INDEX IF NOT EXISTS idx_client_documents_client_id ON client_documents(client_id);
CREATE INDEX IF NOT EXISTS idx_client_notifications_client_id ON client_notifications(client_id);
CREATE INDEX IF NOT EXISTS idx_client_activity_logs_client_id ON client_activity_logs(client_id);
CREATE INDEX IF NOT EXISTS idx_client_sessions_client_id ON client_sessions(client_id);
CREATE INDEX IF NOT EXISTS idx_client_password_resets_token ON client_password_resets(token);
CREATE INDEX IF NOT EXISTS idx_client_bill_payments_client_id ON client_bill_payments(client_id);
CREATE INDEX IF NOT EXISTS idx_agents_agent_id ON agents(agent_id);
CREATE INDEX IF NOT EXISTS idx_deposit_methods_type ON deposit_methods(method_type);
CREATE INDEX IF NOT EXISTS idx_deposit_requests_client_id ON deposit_requests(client_id);
CREATE INDEX IF NOT EXISTS idx_deposit_requests_status ON deposit_requests(status);
CREATE INDEX IF NOT EXISTS idx_client_deposit_methods_client_id ON client_deposit_methods(client_id);
