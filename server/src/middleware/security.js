/**
 * CivicPulse Security Middleware Suite
 * Implements HTTP defense-in-depth:
 * 1. Helmet security headers (CSP, HSTS, X-Frame-Options, noSniff)
 * 2. Tiered Rate Limiting (General & Intake-specific)
 * 3. Input Sanitization & XSS Prevention
 * 4. Administrative Route Authentication
 */

import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { timingSafeEqual } from 'node:crypto';

/**
 * 1. Helmet HTTP Security Headers
 */
export const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: [
        "'self'",
        'data:',
        'blob:',
        'https://*.tile.openstreetmap.org',
        'https://unpkg.com',
      ],
      connectSrc: ["'self'", 'https://*.supabase.co', 'http://localhost:*'],
    },
  },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  xFrameOptions: { action: 'deny' },
  hidePoweredBy: true,
});

/**
 * 2. Multi-Tier Rate Limiters
 *
 * Enforcement is production-by-default. In development the limiters are skipped
 * for loopback traffic unless RATE_LIMIT_STRICT=true, which lets the test suite
 * actually exercise the limiter instead of only ever hitting the skip path.
 */
const rateLimitStrict = () => process.env.RATE_LIMIT_STRICT === 'true';

const isLoopback = (req) => {
  const ip = req.ip || req.connection?.remoteAddress || '';
  return ip.includes('127.0.0.1') || ip === '::1' || ip.includes('::ffff:127.0.0.1');
};

const shouldSkipRateLimit = (req) => {
  if (rateLimitStrict()) return false;
  if (process.env.NODE_ENV === 'production') return false;
  return isLoopback(req);
};

/**
 * Reads a positive integer from the environment, else falls back.
 * Lets deployments tune the budget and lets tests exercise the limiter without
 * issuing thousands of requests.
 */
function envInt(name, fallback) {
  const parsed = Number.parseInt(process.env[name], 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

// General API rate limiter (100 requests / 15 min, per SECURITY.md).
// `max` is resolved per request rather than captured at module load, so
// environment changes take effect without restarting the process.
export const generalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: () => (process.env.NODE_ENV === 'production'
    ? envInt('RATE_LIMIT_MAX_GENERAL', 100)
    : envInt('RATE_LIMIT_MAX_GENERAL', 10000)),
  skip: shouldSkipRateLimit,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests from this IP. Please try again after 15 minutes.',
  },
});

// Citizen intake rate limiter (20 requests / 15 min per IP, per SECURITY.md)
export const submissionRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: () => (process.env.NODE_ENV === 'production'
    ? envInt('RATE_LIMIT_MAX_INTAKE', 20)
    : envInt('RATE_LIMIT_MAX_INTAKE', 5000)),
  skip: shouldSkipRateLimit,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Submission rate limit reached for this IP. Please wait before reporting another complaint.',
  },
});

/**
 * 3. Input Sanitization & Validation Middleware
 * Strips HTML tags, script vectors, trims inputs, and bounds text lengths.
 */
export function sanitizeCitizenInput(req, res, next) {
  if (!req.body || typeof req.body !== 'object') {
    return next();
  }

  const { raw_text, category, region_name, latitude, longitude } = req.body;

  // Validate raw_text presence and length (supports both raw_text and text aliases)
  if (req.method === 'POST' && req.path.includes('/text')) {
    const textContent = req.body.raw_text || req.body.text;
    if (!textContent || typeof textContent !== 'string' || !textContent.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed: raw_text (or text) is required and cannot be empty.',
      });
    }

    if (textContent.length > 2000) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed: raw_text exceeds maximum allowed length of 2000 characters.',
      });
    }

    // Strip HTML/Script vectors to prevent Stored XSS
    req.body.raw_text = textContent
      .replace(/<[^>]*>?/gm, '') // Remove HTML tags
      .replace(/javascript:/gi, '')
      .replace(/onerror\s*=/gi, '')
      .replace(/onload\s*=/gi, '')
      .trim();
  }

  // Sanitize category string
  if (category && typeof category === 'string') {
    req.body.category = category.replace(/<[^>]*>?/gm, '').trim().toLowerCase();
  }

  // Sanitize region_name
  if (region_name && typeof region_name === 'string') {
    req.body.region_name = region_name.replace(/<[^>]*>?/gm, '').trim();
  }

  // Validate coordinates if provided
  if (latitude !== undefined && latitude !== null) {
    const lat = Number(latitude);
    if (isNaN(lat) || lat < -90 || lat > 90) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed: latitude must be a valid number between -90 and 90.',
      });
    }
  }

  if (longitude !== undefined && longitude !== null) {
    const lng = Number(longitude);
    if (isNaN(lng) || lng < -180 || lng > 180) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed: longitude must be a valid number between -180 and 180.',
      });
    }
  }

  next();
}

/**
 * 4. Administrative Authentication Guard
 * Protects administrative actions (e.g. /api/admin/recompute)
 *
 * Fails CLOSED in production: previously it fell back to the hardcoded
 * 'civicpulse-admin-dev-key', which is also committed in .env.example and was
 * shipped verbatim to the browser bundle, leaving the admin surface effectively
 * unauthenticated.
 */
export function requireAdminAuth(req, res, next) {
  const configuredAdminKey = (process.env.ADMIN_API_KEY || '').trim();
  const isProduction = process.env.NODE_ENV === 'production';

  if (!configuredAdminKey) {
    console.error('[SECURITY] ADMIN_API_KEY is not set; admin routes are locked.');
    return res.status(503).json({
      success: false,
      error: 'Admin access is unavailable because ADMIN_API_KEY is not configured on the server.',
    });
  }

  if (isProduction && configuredAdminKey === 'civicpulse-admin-dev-key') {
    console.error('[SECURITY] Refusing to serve admin routes with the well-known development key.');
    return res.status(503).json({
      success: false,
      error: 'Admin access is disabled: the default development key must not be used in production.',
    });
  }

  const providedKey = req.headers['x-admin-key'] ||
                     (req.headers.authorization && req.headers.authorization.replace('Bearer ', ''));

  if (!providedKey || !timingSafeEquals(providedKey.trim(), configuredAdminKey)) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Valid x-admin-key header or Bearer token is required to access admin endpoints.',
    });
  }

  next();
}

/**
 * Constant-time string comparison to avoid leaking the admin key length/content
 * through response timing.
 */
function timingSafeEquals(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
