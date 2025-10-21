import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "../server/_core/oauth.js";
import { appRouter } from "../server/routers.js";
import { createContext } from "../server/_core/context.js";
import { webcrypto } from "node:crypto";
import { ensureGeneratedSubdir } from "../server/_core/paths.js";
import path from "path";
import { readFileSync } from "node:fs";

if (typeof globalThis.crypto === "undefined") {
  (globalThis as unknown as { crypto: typeof webcrypto }).crypto = webcrypto;
}

const app = express();

// Configure body parser
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Serve generated files
const generatedDir = ensureGeneratedSubdir();
app.use("/generated", express.static(generatedDir));

// Serve static files
const publicPath = path.join(process.cwd(), "dist", "public");
app.use(express.static(publicPath));

// OAuth routes
registerOAuthRoutes(app);

// tRPC API
app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

// Serve index.html for all other routes (SPA)
app.get("*", (_req: unknown, res: unknown) => {
  const resAny = res as {
    sendFile?: (filePath: string) => void;
    setHeader?: (name: string, value: string) => void;
    send?: (body: unknown) => void;
    status?: (code: number) => unknown;
  };

  if (typeof resAny.sendFile === "function") {
    resAny.sendFile(path.join(publicPath, "index.html"));
    return;
  }

  const html = readFileSync(path.join(publicPath, "index.html"), "utf8");
  resAny.status?.(200);
  resAny.setHeader?.("Content-Type", "text/html; charset=utf-8");
  resAny.send?.(html);
});

export default app;
