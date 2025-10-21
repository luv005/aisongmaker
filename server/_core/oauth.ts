import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { OAuth2Client } from "google-auth-library";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { ENV } from "./env";
import { sdk } from "./sdk";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

const decodeState = (state: string | undefined): string | null => {
  if (!state) return null;
  try {
    const decoded = Buffer.from(state, "base64").toString("utf8");
    if (!decoded.startsWith("http://") && !decoded.startsWith("https://")) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
};

const determineRedirectUri = (req: Request): string => {
  const forwardedProto = req.headers["x-forwarded-proto"];
  const proto =
    typeof forwardedProto === "string"
      ? forwardedProto.split(",")[0]
      : req.protocol;
  const forwardedHost = req.headers["x-forwarded-host"];
  const host =
    typeof forwardedHost === "string"
      ? forwardedHost.split(",")[0]
      : req.get("host") ?? "localhost:3000";
  return `${proto}://${host}/api/oauth/callback`;
};

export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code) {
      res.status(400).json({ error: "Authorization code is required" });
      return;
    }

    if (!ENV.oauthEnabled) {
      res.redirect(302, "/");
      return;
    }

    if (!ENV.googleClientId || !ENV.googleClientSecret) {
      console.error(
        "[OAuth] Google credentials missing. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET."
      );
      res.status(500).json({ error: "OAuth provider is not configured" });
      return;
    }

    try {
      const redirectUri = determineRedirectUri(req);
      const oauthClient = new OAuth2Client(
        ENV.googleClientId,
        ENV.googleClientSecret,
        redirectUri
      );

      const { tokens } = await oauthClient.getToken({
        code,
        redirect_uri: redirectUri,
      });

      if (!tokens.id_token) {
        throw new Error("Google response did not include an ID token");
      }

      const ticket = await oauthClient.verifyIdToken({
        idToken: tokens.id_token,
        audience: ENV.googleClientId,
      });

      const payload = ticket.getPayload();
      if (!payload || !payload.sub) {
        throw new Error("Google ID token payload missing subject");
      }

      await db.upsertUser({
        id: payload.sub,
        name: payload.name ?? null,
        email: payload.email ?? null,
        loginMethod: "google",
        lastSignedIn: new Date(),
      });

      const sessionToken = await sdk.createSessionToken(payload.sub, {
        name: payload.name ?? "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, {
        ...cookieOptions,
        maxAge: ONE_YEAR_MS,
      });

      const fallbackTarget = "/";
      let redirectTarget = decodeState(state) ?? fallbackTarget;
      const callbackUrl = determineRedirectUri(req);
      if (redirectTarget === callbackUrl) {
        redirectTarget = fallbackTarget;
      }

      console.log(
        `[OAuth] Login successful for Google user ${payload.sub}, redirecting to ${redirectTarget}`
      );

      res.redirect(302, redirectTarget);
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}
