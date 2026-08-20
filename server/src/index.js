const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Run client portal schema migration on startup
const { migrateClientSchema } = require('./database/migrate-clients');
migrateClientSchema();

// Routes - Existing
app.use('/api/auth', require('./routes/auth'));
app.use('/api/forms', require('./routes/forms'));
app.use('/api/fields', require('./routes/fields'));
app.use('/api/submissions', require('./routes/submissions'));
app.use('/api/upload', require('./routes/upload'));

// Routes - Client Portal
app.use('/api/admin/clients', require('./routes/adminClients'));
app.use('/api/admin/agents', require('./routes/agents'));
app.use('/api/admin/deposits', require('./routes/adminDeposits'));
app.use('/api/client', require('./routes/clientPortal'));
app.use('/api/client/deposits', require('./routes/clientDeposits'));

// Serve static files from React app in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../client/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../client/build', 'index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
