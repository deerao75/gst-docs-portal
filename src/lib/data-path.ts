import path from "path";

/** Normalize catalog file_path values for Linux (Vercel) and Windows. */
export function resolveProjectPath(relativePath: string): string {
  const normalized = relativePath.replace(/\\/g, "/");
  if (path.isAbsolute(normalized)) {
    return path.normalize(normalized);
  }
  return path.resolve(process.cwd(), normalized);
}