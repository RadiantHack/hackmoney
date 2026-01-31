/**
 * API base URL – same env var for local and remote.
 * Local:  NEXT_PUBLIC_API_URL=http://localhost:5001 (or set in .env)
 * Remote: NEXT_PUBLIC_API_URL=https://api-xxxx.ondigitalocean.app
 */
export const API_BASE =
  (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_API_URL) ||
  "http://localhost:5001";
