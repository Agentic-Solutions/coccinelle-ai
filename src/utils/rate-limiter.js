// Simple in-memory rate limiter for Cloudflare Workers
// Uses a Map with TTL-based cleanup

const rateLimitStore = new Map();

/**
 * Check if a request should be rate limited
 * @param {string} key - Unique key (e.g., IP + path)
 * @param {number} maxRequests - Max requests per window
 * @param {number} windowMs - Window size in milliseconds
 * @returns {object} { allowed: boolean, remaining: number, retryAfter?: number }
 */
export function checkRateLimit(key, maxRequests = 60, windowMs = 60000) {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now - entry.windowStart > windowMs) {
    rateLimitStore.set(key, { windowStart: now, count: 1 });
    return { allowed: true, remaining: maxRequests - 1 };
  }

  entry.count++;

  if (entry.count > maxRequests) {
    const retryAfter = Math.ceil((entry.windowStart + windowMs - now) / 1000);
    return { allowed: false, remaining: 0, retryAfter };
  }

  return { allowed: true, remaining: maxRequests - entry.count };
}

/**
 * Get client IP from request
 */
export function getClientIP(request) {
  return request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
    'unknown';
}

/**
 * Rate limit middleware - returns a Response if rate limited, null if allowed
 */
export function rateLimitResponse(request, path, { maxRequests = 30, windowMs = 60000 } = {}) {
  const ip = getClientIP(request);
  const key = `${ip}:${path}`;
  const result = checkRateLimit(key, maxRequests, windowMs);

  if (!result.allowed) {
    return new Response(JSON.stringify({
      error: 'Too many requests',
      retryAfter: result.retryAfter
    }), {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(result.retryAfter),
      }
    });
  }

  return null;
}
