import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema.js";
import { sdk } from "./sdk.js";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  const requestUrl =
    typeof (opts.req as { url?: unknown }).url === "string"
      ? (opts.req as { url: string }).url
      : "(unknown)";
  console.log("[Context] Creating context for request:", requestUrl);
  let user: User | null = null;

  try {
    console.log("[Context] Attempting authentication...");
    // Add timeout to prevent hanging
    user = await Promise.race([
      sdk.authenticateRequest(opts.req),
      new Promise<User>((_, reject) => 
        setTimeout(() => reject(new Error('Authentication timeout')), 3000)
      )
    ]);
    console.log("[Context] Authentication successful");
  } catch (error) {
    // Authentication is optional for public procedures.
    console.log("[Context] Authentication failed (expected for public routes):", String(error).substring(0, 100));
    user = null;
  }

  console.log("[Context] Context created");
  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
