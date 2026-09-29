import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import submissionsRouter from './routes/submissions.js';
import priorityRouter from './routes/priority.js';
import regionsRouter from './routes/regions.js';
import adminRouter from './routes/admin.js';
import { isSupabaseConfigured } from './db/supabaseAdmin.js';
import { helmetMiddleware, generalRateLimiter } from './middleware/security.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === 'production';

/**
 * Strict CORS allowlist.
 *
 * CLIENT_ORIGIN accepts a comma-separated list of trusted frontend origins.
 * Previously this was `origin: true`, which reflects any requesting origin back
 * to the client and therefore offered no origin restriction at all — this
 * directly contradicted the origin-whitelisting claim in SECURITY.md / plan.md.
 */
const configuredOrigins = (process.env.CLIENT_ORIGIN || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

const isOriginAllowed = (origin) => {
  if (!origin) return true; // same-origin / curl / server-to-server
  if (configuredOrigins.includes(origin)) return true;
  // Local dev hosts are only trusted outside production.
  if (!isProduction && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return true;
  return false;
};

const corsOptions = {
  origin(origin, callback) {
    if (isOriginAllowed(origin)) return callback(null, true);
    console.warn(`[CORS] Blocked request from disallowed origin: ${origin}`);
    return callback(new Error('Origin not permitted by CORS policy.'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-key'],
};

// CORS configuration (MUST be first so errors and rate limits include CORS headers)
app.use(cors(corsOptions));

// Security Headers & Rate Limiting
app.use(helmetMiddleware);
app.use(generalRateLimiter);

// Payload size limit to prevent memory exhaustion DoS
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

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
app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    requested_url: req.originalUrl,
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  // Multer rejects oversized / malformed uploads with MulterError; surface a
  // correct 4xx instead of a generic 500.
  if (err?.name === 'MulterError') {
    const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    return res.status(status).json({
      success: false,
      error: err.code === 'LIMIT_FILE_SIZE'
        ? 'Uploaded audio exceeds the maximum allowed size of 10MB.'
        : `Upload rejected: ${err.message}`,
    });
  }

  // Body-parser rejects payloads over the 100kb limit.
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      error: 'Request payload too large. Limit is 100kb.',
    });
  }

  // Rejected CORS origins should surface as 403, not 500.
  if (err?.message === 'Origin not permitted by CORS policy.') {
    return res.status(403).json({
      success: false,
      error: err.message,
    });
  }

  const status = err.status || err.statusCode || 500;
  if (status >= 500) {
    console.error('[SERVER ERROR]', err);
  }
  res.status(status).json({
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

    // Perform immediate background data harmonization on startup
    import('./db/supabaseAdmin.js').then(({ recomputeAll }) => {
      recomputeAll().then(() => {
        console.log('[CivicPulse] Startup data harmonization and priority sync complete.');
      }).catch(err => console.warn('[Startup Sync Error]', err.message));
    });
  });
}

export default app;
