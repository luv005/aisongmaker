import fs from "fs";
import path from "path";
import { fileURLToPath } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(currentDir, "..", "..");

const tryEnsureDir = (dirPath: string | undefined | null): string | null => {
  if (!dirPath) return null;
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    fs.accessSync(dirPath, fs.constants.W_OK);
    return dirPath;
  } catch (error) {
    console.warn("[Paths] Unable to ensure directory:", dirPath, error);
    return null;
  }
};

const resolveGeneratedBase = () => {
  const envRoot = tryEnsureDir(process.env.GENERATED_ROOT ?? undefined);
  if (envRoot) return envRoot;

  const localRoot = tryEnsureDir(path.resolve(projectRoot, "generated"));
  if (localRoot) return localRoot;

  const tmpRoot = tryEnsureDir(
    path.resolve(process.env.TMPDIR || "/tmp", "aisongmaker", "generated")
  );
  if (tmpRoot) return tmpRoot;

  // Fallback to project root even if not writable to avoid undefined paths.
  return path.resolve(projectRoot, "generated");
};

const GENERATED_BASE = resolveGeneratedBase();

export function resolveFromRoot(...segments: string[]) {
  return path.resolve(projectRoot, ...segments);
}

export function ensureDir(dirPath: string) {
  tryEnsureDir(dirPath);
}

export function ensureGeneratedSubdir(...segments: string[]) {
  const target = path.resolve(GENERATED_BASE, ...segments);
  ensureDir(target);
  return target;
}

export function getGeneratedPublicPath(...segments: string[]) {
  const cleaned = segments.filter(Boolean).join("/");
  return `/generated/${cleaned}`.replace(/\/+/g, "/");
}
