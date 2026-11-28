const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_FAILED_ATTEMPTS = 10;

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const globalForRateLimit = globalThis as unknown as {
  __registrarDocsLoginAttempts?: Map<string, RateLimitEntry>;
};

function getStore(): Map<string, RateLimitEntry> {
  if (!globalForRateLimit.__registrarDocsLoginAttempts) {
    globalForRateLimit.__registrarDocsLoginAttempts = new Map();
  }
  return globalForRateLimit.__registrarDocsLoginAttempts;
}

function makeKey(ip: string, identifier: string): string {
  return `${ip}::${identifier.trim().toLowerCase()}`;
}

export function checkLoginRateLimit(
  ip: string,
  identifier: string
): { allowed: boolean; retryAfterSeconds: number } {
  const store = getStore();
  const key = makeKey(ip, identifier);
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    if (entry) store.delete(key);
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (entry.count >= MAX_FAILED_ATTEMPTS) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
    };
  }

  return { allowed: true, retryAfterSeconds: 0 };
}

export function recordFailedLoginAttempt(ip: string, identifier: string): void {
  const store = getStore();
  const key = makeKey(ip, identifier);
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + WINDOW_MS });
  } else {
    entry.count += 1;
  }
}

export function clearFailedLoginAttempts(ip: string, identifier: string): void {
  const store = getStore();
  store.delete(makeKey(ip, identifier));
}
