import { createHmac } from "node:crypto";
import { isIP } from "node:net";

// The deployment edge overwrites this header; web has no published production port.
export function authClientHeaders(
  headers: { get(name: string): string | null },
  email: string,
): Record<string, string> {
  const secret = process.env.AUTH_PROXY_SECRET;
  const ip = headers.get("x-atlas-client-ip");
  if (!secret || secret.length < 32 || !ip || !isIP(ip)) return {};
  const timestamp = String(Date.now());
  return {
    "x-atlas-client-ip": ip,
    "x-atlas-auth-time": timestamp,
    "x-atlas-auth-signature": createHmac("sha256", secret)
      .update(`${timestamp}\n${ip}\n${email.trim().toLowerCase()}`)
      .digest("hex"),
  };
}
