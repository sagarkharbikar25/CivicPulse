import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import submissionsRouter from './routes/submissions.js';
import priorityRouter from './routes/priority.js';
import regionsRouter from './routes/regions.js';
import adminRouter from './routes/admin.js';
import { isSupabaseConfigured } from './db/supabaseAdmin.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging in development
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (process.env.NODE_ENV !== 'test') {
      console.log(`[HTTP] ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'CivicPulse Core Backend API',
    branch: 'feature/core-backend',
    version: '1.0.0',
    uptime_seconds: Math.floor(process.uptime()),
    supabase_configured: isSupabaseConfigured,
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/submissions', submissionsRouter);
app.use('/api/priority', priorityRouter);
app.use('/api/regions', regionsRouter);
app.use('/api/admin', adminRouter);

// 404 Handler
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    requested_url: req.originalUrl,
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[SERVER ERROR]', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error',
  });
});

// Start server when executed directly
const isDirectExecution = process.argv[1] && (
  fileURLToPath(import.meta.url) === process.argv[1] || 
  process.argv[1].endsWith('src\\index.js') || 
  process.argv[1].endsWith('src/index.js')
);

if (isDirectExecution) {
  app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(` CivicPulse Backend API running on port ${PORT}`);
    console.log(` Health check: http://localhost:${PORT}/api/health`);
    console.log(` Submissions:  http://localhost:${PORT}/api/submissions`);
    console.log(` Priority:     http://localhost:${PORT}/api/priority`);
    console.log(` Heatmap:      http://localhost:${PORT}/api/priority/heatmap`);
    console.log(` Regions:      http://localhost:${PORT}/api/regions`);
    console.log(`=======================================================`);
  });
}

export default app;
