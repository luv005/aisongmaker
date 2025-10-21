import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "../server/_core/oauth";
import { appRouter } from "../server/routers";
import { createContext } from "../server/_core/context";
import { webcrypto } from "node:crypto";
import { ensureGeneratedSubdir } from "../server/_core/paths";
import path from "path";

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
app.get("*", (req, res) => {
  res.sendFile(path.join(publicPath, "index.html"));
});

export default app;

