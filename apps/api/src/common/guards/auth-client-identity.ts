import { createHmac, timingSafeEqual } from 'node:crypto';
import { isIP } from 'node:net';

export function authClientIp(request: any, secret = process.env.AUTH_PROXY_SECRET): string {
  const ip = request.headers?.['x-atlas-client-ip'];
  const timestamp = request.headers?.['x-atlas-auth-time'];
  const signature = request.headers?.['x-atlas-auth-signature'];
  if (
    secret &&
    secret.length >= 32 &&
    typeof ip === 'string' &&
    isIP(ip) &&
    typeof timestamp === 'string' &&
    /^\d{13}$/.test(timestamp) &&
    Math.abs(Date.now() - Number(timestamp)) <= 30000 &&
    typeof signature === 'string' &&
    /^[a-f0-9]{64}$/.test(signature)
  ) {
    const email =
      typeof request.body?.email === 'string' ? request.body.email.trim().toLowerCase() : '';
    const expected = createHmac('sha256', secret).update(`${timestamp}\n${ip}\n${email}`).digest();
    if (timingSafeEqual(expected, Buffer.from(signature, 'hex'))) return ip;
  }
  return request.ip || 'unknown';
}
