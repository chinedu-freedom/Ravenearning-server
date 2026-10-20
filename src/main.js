import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import dns from 'dns';
import apiRoutes from './routes/index.js';
import { initCron } from './cron.js';
import { runSeed } from './seed.js';

// Force Node.js to use IPv4 first for outgoing API requests
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

dotenv.config();

// Production Security Check: Ensure JWT_SECRET is configured
if (process.env.NODE_ENV === 'production' && (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'supersecret')) {
  console.error('\x1b[31m[SECURITY WARNING] JWT_SECRET is unset or using default fallback! Please configure a strong, random JWT_SECRET in your .env file.\x1b[0m');
}

// Run database auto-seed on startup (non-destructive, zero overwrites)
runSeed().catch(err => console.error('Auto-seed notice:', err.message));

// Initialize automated tasks
initCron();

const app = express();
const port = process.env.PORT || 3001;

// Allowed CORS origins
const allowedOrigins = [
  'https://suncerestcapital.com',
  'https://www.suncerestcapital.com',
  'https://admin.suncerestcapital.com',
  'http://localhost:3000',
  'http://localhost:3002'
];

if (process.env.FRONTEND_URL && !allowedOrigins.includes(process.env.FRONTEND_URL)) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}
if (process.env.ADMIN_URL && !allowedOrigins.includes(process.env.ADMIN_URL)) {
  allowedOrigins.push(process.env.ADMIN_URL);
}

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (webhooks, server-to-server, curl, mobile apps)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    return callback(new Error(`CORS policy: Origin ${origin} not allowed`));
  },
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Main API Router
app.use('/api', apiRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Suncerest Capital API is running securely!' });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server is running on port ${port}`);
});
