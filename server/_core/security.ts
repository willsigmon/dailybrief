/**
 * Security middleware and headers
 */

import type { Request, Response, NextFunction } from 'express';

/**
 * Add security headers to responses
 */
export function securityHeaders(req: Request, res: Response, next: NextFunction): void {
  // Strict Transport Security (HSTS)
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

  // Content Security Policy
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Needed for Vite in dev
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://api.perplexity.ai https://api.x.ai https://generativelanguage.googleapis.com https://forge.manus.im",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');

  res.setHeader('Content-Security-Policy', csp);

  // X-Content-Type-Options
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // X-Frame-Options
  res.setHeader('X-Frame-Options', 'DENY');

  // X-XSS-Protection
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Referrer-Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions-Policy
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  next();
}

/**
 * Sanitize user input to prevent XSS
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Validate and sanitize request body
 */
export function sanitizeRequestBody(req: Request, res: Response, next: NextFunction): void {
  if (req.body && typeof req.body === 'object') {
    const sanitize = (obj: Record<string, unknown>): Record<string, unknown> => {
      const sanitized: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
          sanitized[key] = sanitizeInput(value);
        } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          sanitized[key] = sanitize(value as Record<string, unknown>);
        } else if (Array.isArray(value)) {
          sanitized[key] = value.map(v => typeof v === 'string' ? sanitizeInput(v) : v);
        } else {
          sanitized[key] = value;
        }
      }
      return sanitized;
    };

    req.body = sanitize(req.body);
  }
  next();
}
