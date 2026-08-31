export function normalizeBasePath(value?: string) {
  if (!value || value === "/") return "";
  const withLeadingSlash = value.startsWith("/") ? value : `/${value}`;
  return withLeadingSlash.replace(/\/+$/, "");
}

export const appBasePath = normalizeBasePath(process.env.NEXT_PUBLIC_BASE_PATH);

export function appPath(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (appBasePath && (normalizedPath === appBasePath || normalizedPath.startsWith(`${appBasePath}/`))) return normalizedPath;
  return `${appBasePath}${normalizedPath}`;
}

export function appUrl(path: string) {
  const appOrigin = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (appBasePath && appOrigin.endsWith(appBasePath)) return `${appOrigin}${normalizedPath}`;
  return `${appOrigin}${appPath(normalizedPath)}`;
}
