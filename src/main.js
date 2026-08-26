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

// Run database auto-seed on startup
runSeed().catch(err => console.error('Auto-seed notice:', err.message));

// Initialize automated tasks
initCron();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Main API Router
app.use('/api', apiRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Omni Backend is running!' });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server is running on port ${port}`);
});
