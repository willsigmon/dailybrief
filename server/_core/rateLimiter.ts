/**
 * Rate limiting middleware for API protection
 */

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

class RateLimiter {
  private store: RateLimitStore = {};
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(windowMs: number, maxRequests: number) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;

    // Clean up expired entries every minute
    setInterval(() => this.cleanup(), 60 * 1000);
  }

  /**
   * Check if request should be allowed
   */
  check(key: string): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const entry = this.store[key];

    if (!entry || now > entry.resetTime) {
      // Create new window
      this.store[key] = {
        count: 1,
        resetTime: now + this.windowMs,
      };
      return {
        allowed: true,
        remaining: this.maxRequests - 1,
        resetTime: now + this.windowMs,
      };
    }

    if (entry.count >= this.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime,
      };
    }

    entry.count++;
    return {
      allowed: true,
      remaining: this.maxRequests - entry.count,
      resetTime: entry.resetTime,
    };
  }

  /**
   * Remove expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const key in this.store) {
      if (now > this.store[key].resetTime) {
        delete this.store[key];
      }
    }
  }

  /**
   * Reset rate limit for a key
   */
  reset(key: string): void {
    delete this.store[key];
  }
}

// Create rate limiters for different endpoints
export const apiRateLimiter = new RateLimiter(15 * 60 * 1000, 100); // 100 requests per 15 minutes
export const briefingGenerationRateLimiter = new RateLimiter(60 * 60 * 1000, 5); // 5 requests per hour
export const llmApiRateLimiter = new RateLimiter(60 * 1000, 20); // 20 requests per minute

/**
 * Get client identifier from request
 */
export function getClientId(req: { ip?: string; headers?: Record<string, string | string[] | undefined> }): string {
  // Try to get IP from various headers (for proxies)
  const forwarded = req.headers?.['x-forwarded-for'];
  const ip = Array.isArray(forwarded) ? forwarded[0] : forwarded || req.ip || 'unknown';
  return ip.split(',')[0].trim();
}

/**
 * Express middleware for rate limiting
 */
export function rateLimitMiddleware(
  limiter: RateLimiter,
  options?: { message?: string; skipSuccessfulRequests?: boolean }
) {
  return (req: any, res: any, next: any) => {
    const clientId = getClientId(req);
    const result = limiter.check(clientId);

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', limiter['maxRequests']);
    res.setHeader('X-RateLimit-Remaining', result.remaining);
    res.setHeader('X-RateLimit-Reset', new Date(result.resetTime).toISOString());

    if (!result.allowed) {
      const message = options?.message || 'Too many requests, please try again later';
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message,
        retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
      });
    }

    next();
  };
}
