export const API_BASE_URL: string =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

export function resolveFileUrl(url?: string): string {
  if (!url) return "";

  const trimmed = url.trim();
  if (!trimmed) return "";
  if (/^(blob:|data:|https?:\/\/)/i.test(trimmed)) return trimmed;

  const apiOrigin = API_BASE_URL.replace(/\/api\/?$/, "").replace(/\/$/, "");
  if (trimmed.startsWith("/")) return `${apiOrigin}${trimmed}`;

  return `${apiOrigin}/${trimmed}`;
}

export function isDisplayableImageUrl(url?: string): boolean {
  if (!url) return false;
  return /^(https?:\/\/|blob:|data:|\/)/i.test(url.trim());
}
