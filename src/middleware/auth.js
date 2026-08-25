import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

export const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const token = authHeader.split(' ')[1];

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(401).json({ error: 'Invalid or expired token', success: false });
      }
      req.user = decoded;
      if (!req.user.id && req.user.userId) {
        req.user.id = req.user.userId;
      }
      next();
    });
  } else {
    res.status(401).json({ error: 'Authorization header missing', success: false });
  }
};

export const requireAdmin = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'superadmin')) {
    next();
  } else {
    res.status(403).json({ error: 'Admin access required' });
  }
};
