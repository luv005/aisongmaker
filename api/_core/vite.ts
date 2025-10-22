import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import cryptoNative, { type BinaryToTextEncoding } from "node:crypto";
import { fileURLToPath } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const resolveFromRoot = (...segments: string[]) => path.resolve(currentDir, ...segments);

type HashInput = string | ArrayBuffer | ArrayBufferView;

const normalizeHashInput = (input: HashInput) => {
  if (typeof input === "string") return input;
  if (ArrayBuffer.isView(input)) {
    return Buffer.from(input.buffer, input.byteOffset, input.byteLength);
  }
  if (input instanceof ArrayBuffer) {
    return Buffer.from(input);
  }
  throw new TypeError("Unsupported data type for crypto.hash");
};

const ensureCryptoHash = () => {
  const cryptoGlobal = globalThis.crypto as Crypto & {
    hash?: (algorithm: string, input: HashInput, encoding?: BinaryToTextEncoding) => string | Buffer;
  };

  const ensure = (target: Record<string, unknown>) => {
    if (typeof target.hash === "function") return;
    Object.defineProperty(target, "hash", {
      value: (algorithm: string, input: HashInput, encoding?: BinaryToTextEncoding) => {
        const hash = cryptoNative.createHash(algorithm);
        hash.update(normalizeHashInput(input));
        return encoding ? hash.digest(encoding) : hash.digest();
      },
      configurable: true,
      writable: true,
    });
  };

  if (cryptoGlobal) ensure(cryptoGlobal as unknown as Record<string, unknown>);
  ensure(cryptoNative as unknown as Record<string, unknown>);
};

ensureCryptoHash();

export async function setupVite(app: Express, server: Server) {
  console.log("[Vite] Setting up Vite dev server...");
  
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  try {
    const { createServer: createViteServer } = await import("vite");
    const { default: viteConfig } = await import("../../vite.config.ts");
    const vite = await createViteServer({
      ...viteConfig,
      configFile: false,
      server: serverOptions,
      appType: "custom",
    });

    console.log("[Vite] Vite server created successfully");

    app.use(vite.middlewares);
    app.use("*", async (req, res, next) => {
      const url = req.originalUrl;

      try {
        const requestPath = url.split("?")[0] ?? "";
        if (/\.[\w-]+$/.test(requestPath)) {
          return next();
        }

        const clientTemplate = resolveFromRoot("..", "..", "client", "index.html");

        // always reload the index.html file from disk incase it changes
        let template = await fs.promises.readFile(clientTemplate, "utf-8");
        template = template.replace(
          `src="/src/main.tsx"`,
          `src="/src/main.tsx?v=${nanoid()}"`
        );
        const page = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(page);
      } catch (e) {
        console.error("[Vite] Error serving page:", e);
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
    
    console.log("[Vite] Setup complete");
  } catch (error) {
    console.error("[Vite] Failed to setup Vite:", error);
    throw error;
  }
}

export function serveStatic(app: Express) {
  const distPath =
    process.env.NODE_ENV === "development"
      ? resolveFromRoot("..", "..", "dist", "public")
      : resolveFromRoot("public");
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
