const DEFAULT_API_URL = "http://localhost:3000";
const DEFAULT_PLACEHOLDER = "/placeholder-site.svg";

export function getApiBaseUrl() {
  return import.meta.env.VITE_COLLECT_API_URL ?? DEFAULT_API_URL;
}

export function resolveStoragePublicUrl(publicUrl: string) {
  if (publicUrl.startsWith("http://") || publicUrl.startsWith("https://")) return publicUrl;
  if (publicUrl.startsWith("/storage")) return new URL(publicUrl, getApiBaseUrl()).toString();
  return publicUrl;
}

export function getDisplayImageSrc(
  publicUrl?: string | null,
  { placeholder = DEFAULT_PLACEHOLDER }: { placeholder?: string } = {}
) {
  if (!publicUrl) return placeholder;

  const resolved = resolveStoragePublicUrl(publicUrl);

  try {
    if (resolved.startsWith("http://") || resolved.startsWith("https://")) {
      const host = new URL(resolved).hostname;
      if (host === "cdn.collect.design") return placeholder;
    }
  } catch {
    // ignore
  }

  return resolved;
}

