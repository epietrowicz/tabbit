export const API_BASE =
  import.meta.env.VITE_API_BASE ?? (import.meta.env.DEV ? "/api" : "");

export function fileUrl(path) {
  return `${API_BASE}${path}`;
}
