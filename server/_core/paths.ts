import fs from "fs";
import path from "path";
import { fileURLToPath } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(currentDir, "..", "..");

export function resolveFromRoot(...segments: string[]) {
  return path.resolve(projectRoot, ...segments);
}

export function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

export function ensureGeneratedSubdir(...segments: string[]) {
  const target = resolveFromRoot("generated", ...segments);
  ensureDir(target);
  return target;
}

export function getGeneratedPublicPath(...segments: string[]) {
  const cleaned = segments.filter(Boolean).join("/");
  return `/generated/${cleaned}`.replace(/\/+/g, "/");
}
