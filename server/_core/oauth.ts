import { COOKIE_NAME, ONE_YEAR_MS } from "../../shared/const.js";
import { OAuth2Client } from "google-auth-library";
import * as db from "../db.js";
import { getSessionCookieOptions } from "./cookies.js";
import { ENV } from "./env.js";
import { sdk } from "./sdk.js";

type HeaderValue = string | string[] | undefined;

type RequestLike = {
  query?: Record<string, unknown>;
  headers?: Record<string, HeaderValue>;
  protocol?: string;
  get?: (field: string) => string | undefined;
};

type ResponseLike = {
  status?: (code: number) => ResponseLike | void;
  json?: (body: unknown) => ResponseLike | void;
  redirect?: (statusOrUrl: number | string, url?: string) => void;
  cookie?: (name: string, value: string, options?: Record<string, unknown>) => void;
  clearCookie?: (name: string, options?: Record<string, unknown>) => void;
};

type ExpressLike = {
  get: (path: string, handler: (req: RequestLike, res: ResponseLike) => void) => void;
};

const getQueryParam = (req: RequestLike, key: string): string | undefined => {
  const value = req.query?.[key];
  return typeof value === "string" ? value : undefined;
};

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

const determineRedirectUri = (req: RequestLike): string => {
  const headers = req.headers ?? {};
  const forwardedProtoHeader = headers["x-forwarded-proto"];
  const protoCandidate =
    typeof forwardedProtoHeader === "string"
      ? forwardedProtoHeader.split(",")[0]
      : Array.isArray(forwardedProtoHeader)
        ? forwardedProtoHeader[0]
        : undefined;
  const proto = protoCandidate ?? req.protocol ?? "http";

  const forwardedHostHeader = headers["x-forwarded-host"];
  const hostCandidate =
    typeof forwardedHostHeader === "string"
      ? forwardedHostHeader.split(",")[0]
      : Array.isArray(forwardedHostHeader)
        ? forwardedHostHeader[0]
        : undefined;

  const host =
    hostCandidate ??
    headers.host ??
    req.get?.("host") ??
    "localhost:3000";
  return `${proto}://${host}/api/oauth/callback`;
};

const setStatus = (res: ResponseLike, statusCode: number): ResponseLike => {
  if (typeof res.status === "function") {
    const result = res.status(statusCode);
    if (result && typeof result === "object") {
      return result as ResponseLike;
    }
  }
  return res;
};

const sendJson = (res: ResponseLike, statusCode: number, body: unknown) => {
  const target = setStatus(res, statusCode);
  target.json?.(body);
};

const redirect = (res: ResponseLike, status: number, url: string) => {
  if (typeof res.redirect === "function") {
    try {
      res.redirect(status, url);
      return;
    } catch {
      res.redirect(url);
    }
  }
};

export function registerOAuthRoutes(app: ExpressLike) {
  app.get("/api/oauth/callback", async (req, res) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code) {
      sendJson(res, 400, { error: "Authorization code is required" });
      return;
    }

    if (!ENV.oauthEnabled) {
      redirect(res, 302, "/");
      return;
    }

    if (!ENV.googleClientId || !ENV.googleClientSecret) {
      console.error(
        "[OAuth] Google credentials missing. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET."
      );
      sendJson(res, 500, { error: "OAuth provider is not configured" });
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

      res.cookie?.(
        COOKIE_NAME,
        sessionToken,
        {
          ...getSessionCookieOptions(req),
          maxAge: ONE_YEAR_MS,
        }
      );

      const fallbackTarget = "/";
      let redirectTarget = decodeState(state) ?? fallbackTarget;
      const callbackUrl = determineRedirectUri(req);
      if (redirectTarget === callbackUrl) {
        redirectTarget = fallbackTarget;
      }

      console.log(
        `[OAuth] Login successful for Google user ${payload.sub}, redirecting to ${redirectTarget}`
      );

      redirect(res, 302, redirectTarget);
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      sendJson(res, 500, { error: "OAuth callback failed" });
    }
  });
}
