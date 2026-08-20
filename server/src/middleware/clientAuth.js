const jwt = require('jsonwebtoken');

const clientAuth = (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET + '_client');
    
    if (decoded.role !== 'client') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    req.client = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

module.exports = clientAuth;
