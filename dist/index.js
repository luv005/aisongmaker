var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// drizzle/schema.ts
import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";
var users, musicTracks, voiceCovers, voiceModels;
var init_schema = __esm({
  "drizzle/schema.ts"() {
    "use strict";
    users = mysqlTable("users", {
      id: varchar("id", { length: 64 }).primaryKey(),
      name: text("name"),
      email: varchar("email", { length: 320 }),
      loginMethod: varchar("loginMethod", { length: 64 }),
      role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
      createdAt: timestamp("createdAt").defaultNow(),
      lastSignedIn: timestamp("lastSignedIn").defaultNow()
    });
    musicTracks = mysqlTable("music_tracks", {
      id: varchar("id", { length: 64 }).primaryKey(),
      userId: varchar("userId", { length: 64 }).notNull(),
      taskId: varchar("taskId", { length: 64 }),
      title: varchar("title", { length: 255 }),
      prompt: text("prompt"),
      style: varchar("style", { length: 255 }),
      model: varchar("model", { length: 32 }),
      instrumental: mysqlEnum("instrumental", ["yes", "no"]).default("no"),
      audioUrl: text("audioUrl"),
      streamUrl: text("streamUrl"),
      status: mysqlEnum("status", ["pending", "processing", "completed", "failed"]).default("pending").notNull(),
      createdAt: timestamp("createdAt").defaultNow()
    });
    voiceCovers = mysqlTable("voice_covers", {
      id: varchar("id", { length: 64 }).primaryKey(),
      userId: varchar("userId", { length: 64 }).notNull(),
      voiceModelId: varchar("voiceModelId", { length: 64 }).notNull(),
      voiceModelName: varchar("voiceModelName", { length: 128 }).notNull(),
      originalAudioUrl: text("originalAudioUrl"),
      convertedAudioUrl: text("convertedAudioUrl"),
      status: mysqlEnum("status", ["processing", "completed", "failed"]).default("processing").notNull(),
      pitchChange: varchar("pitchChange", { length: 32 }),
      duration: int("duration").default(0),
      createdAt: timestamp("createdAt").defaultNow()
    });
    voiceModels = mysqlTable("voice_models", {
      id: varchar("id", { length: 64 }).primaryKey(),
      name: varchar("name", { length: 128 }).notNull(),
      category: varchar("category", { length: 64 }).notNull(),
      avatarUrl: text("avatarUrl"),
      demoAudioUrl: text("demoAudioUrl"),
      uses: int("uses").default(0),
      likes: int("likes").default(0),
      isTrending: int("isTrending").default(0),
      createdAt: timestamp("createdAt").defaultNow()
    });
  }
});

// server/_core/env.ts
var ENV;
var init_env = __esm({
  "server/_core/env.ts"() {
    "use strict";
    ENV = {
      appId: process.env.VITE_APP_ID ?? "",
      cookieSecret: process.env.JWT_SECRET ?? "",
      databaseUrl: process.env.DATABASE_URL ?? "",
      ownerId: process.env.OWNER_OPEN_ID ?? "",
      ownerName: process.env.OWNER_NAME ?? "",
      isProduction: process.env.NODE_ENV === "production",
      forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
      forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
      forgeFeaturesEnabled: process.env.ENABLE_FORGE_API === "true",
      oauthEnabled: process.env.ENABLE_OAUTH === "true",
      googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
      googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      openaiApiKey: process.env.OPENAI_API_KEY ?? "",
      awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "",
      awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
      awsSessionToken: process.env.AWS_SESSION_TOKEN ?? "",
      awsRegion: process.env.AWS_REGION ?? "",
      s3Bucket: process.env.S3_BUCKET ?? "",
      s3PublicBaseUrl: process.env.S3_PUBLIC_BASE_URL ?? ""
    };
  }
});

// server/db.ts
var db_exports = {};
__export(db_exports, {
  createMusicTrack: () => createMusicTrack,
  createVoiceCover: () => createVoiceCover,
  getDb: () => getDb,
  getMusicTrackById: () => getMusicTrackById,
  getUser: () => getUser,
  getUserMusicTracks: () => getUserMusicTracks,
  getUserVoiceCovers: () => getUserVoiceCovers,
  updateMusicTrack: () => updateMusicTrack,
  updateVoiceCover: () => updateVoiceCover,
  upsertUser: () => upsertUser
});
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { createPool } from "mysql2";
import { desc } from "drizzle-orm";
function createPoolConfig(url) {
  const parsed = new URL(url);
  const database = parsed.pathname.replace(/^\//, "");
  if (!database) {
    throw new Error("DATABASE_URL must include a database name");
  }
  const port = parsed.port ? Number.parseInt(parsed.port, 10) : 3306;
  const config = {
    host: parsed.hostname,
    port,
    database,
    waitForConnections: true,
    connectionLimit: 10,
    connectTimeout: 5e3,
    queueLimit: 0
  };
  if (parsed.username) {
    config.user = decodeURIComponent(parsed.username);
  }
  if (parsed.password) {
    config.password = decodeURIComponent(parsed.password);
  }
  const hasSslMode = parsed.searchParams.get("ssl-mode");
  const sslMode = hasSslMode ? hasSslMode.toLowerCase() : void 0;
  const disableSsl = sslMode === "disable" || sslMode === "disabled" || parsed.searchParams.get("ssl") === "0" || parsed.searchParams.get("ssl") === "false";
  const isLocalhost = LOCAL_HOSTS.has(parsed.hostname);
  if (!disableSsl && !isLocalhost) {
    config.ssl = {
      rejectUnauthorized: true
    };
  }
  return config;
}
async function initializeDb() {
  if (_db) return _db;
  if (_connectionPromise) return _connectionPromise;
  if (!ENV.databaseUrl) {
    console.warn("[Database] DATABASE_URL not configured");
    return null;
  }
  _connectionPromise = (async () => {
    console.log("[Database] Attempting to connect...");
    try {
      const pool = createPool(createPoolConfig(ENV.databaseUrl));
      await Promise.race([
        new Promise((resolve, reject) => {
          pool.query("SELECT 1", (err) => {
            if (err) reject(err);
            else resolve(true);
          });
        }),
        new Promise(
          (_, reject) => setTimeout(() => reject(new Error("Connection timeout")), 5e3)
        )
      ]);
      _db = drizzle(pool);
      console.log("[Database] Connected successfully");
      return _db;
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
      return null;
    } finally {
      _connectionPromise = null;
    }
  })();
  return _connectionPromise;
}
async function getDb() {
  if (_db) return _db;
  return initializeDb();
}
async function upsertUser(user) {
  if (!user.id) {
    throw new Error("User ID is required for upsert");
  }
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }
  try {
    const values = {
      id: user.id
    };
    const updateSet = {};
    const textFields = ["name", "email", "loginMethod"];
    const assignNullable = (field) => {
      const value = user[field];
      if (value === void 0) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== void 0) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role === void 0) {
      if (user.id === ENV.ownerId) {
        user.role = "admin";
        values.role = "admin";
        updateSet.role = "admin";
      }
    }
    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = /* @__PURE__ */ new Date();
    }
    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}
async function getUser(id) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return void 0;
  }
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function createMusicTrack(track) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot create music track: database not available");
    return void 0;
  }
  const result = await db.insert(musicTracks).values(track);
  return track;
}
async function getUserMusicTracks(userId) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get music tracks: database not available");
    return [];
  }
  return db.select().from(musicTracks).where(eq(musicTracks.userId, userId)).orderBy(desc(musicTracks.createdAt));
}
async function getMusicTrackById(id) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get music track: database not available");
    return void 0;
  }
  const result = await db.select().from(musicTracks).where(eq(musicTracks.id, id)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function updateMusicTrack(id, updates) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update music track: database not available");
    return void 0;
  }
  await db.update(musicTracks).set(updates).where(eq(musicTracks.id, id));
}
async function createVoiceCover(cover) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot create voice cover: database not available");
    return void 0;
  }
  try {
    await db.insert(voiceCovers).values(cover);
    return cover;
  } catch (error) {
    console.error("[Database] Failed to create voice cover:", error);
    throw error;
  }
}
async function updateVoiceCover(id, updates) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update voice cover: database not available");
    return void 0;
  }
  try {
    await db.update(voiceCovers).set(updates).where(eq(voiceCovers.id, id));
  } catch (error) {
    console.error("[Database] Failed to update voice cover:", error);
    throw error;
  }
}
async function getUserVoiceCovers(userId) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get voice covers: database not available");
    return [];
  }
  try {
    return await db.select().from(voiceCovers).where(eq(voiceCovers.userId, userId)).orderBy(desc(voiceCovers.createdAt));
  } catch (error) {
    console.error("[Database] Failed to get voice covers:", error);
    return [];
  }
}
var _db, _connectionPromise, LOCAL_HOSTS;
var init_db = __esm({
  "server/db.ts"() {
    "use strict";
    init_schema();
    init_env();
    init_schema();
    init_schema();
    _db = null;
    _connectionPromise = null;
    LOCAL_HOSTS = /* @__PURE__ */ new Set(["localhost", "127.0.0.1"]);
    if (ENV.databaseUrl) {
      initializeDb().catch(() => {
      });
    }
  }
});

// server/_core/forge.ts
var ForgeFeatureDisabledError, isForgeEnabled, assertForgeEnabled;
var init_forge = __esm({
  "server/_core/forge.ts"() {
    "use strict";
    init_env();
    ForgeFeatureDisabledError = class extends Error {
      constructor(featureLabel) {
        const label = featureLabel?.trim() || "Forge API features";
        super(`${label} are disabled`);
        this.name = "ForgeFeatureDisabledError";
      }
    };
    isForgeEnabled = () => ENV.forgeFeaturesEnabled;
    assertForgeEnabled = (featureLabel) => {
      if (!isForgeEnabled()) {
        throw new ForgeFeatureDisabledError(featureLabel);
      }
    };
  }
});

// server/_core/paths.ts
import fs from "fs";
import path from "path";
import { fileURLToPath } from "node:url";
function ensureDir(dirPath) {
  tryEnsureDir(dirPath);
}
function ensureGeneratedSubdir(...segments) {
  const target = path.resolve(GENERATED_BASE, ...segments);
  ensureDir(target);
  return target;
}
function getGeneratedPublicPath(...segments) {
  const cleaned = segments.filter(Boolean).join("/");
  return `/generated/${cleaned}`.replace(/\/+/g, "/");
}
var currentDir, projectRoot, tryEnsureDir, resolveGeneratedBase, GENERATED_BASE;
var init_paths = __esm({
  "server/_core/paths.ts"() {
    "use strict";
    currentDir = path.dirname(fileURLToPath(import.meta.url));
    projectRoot = path.resolve(currentDir, "..", "..");
    tryEnsureDir = (dirPath) => {
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
    resolveGeneratedBase = () => {
      const envRoot = tryEnsureDir(process.env.GENERATED_ROOT ?? void 0);
      if (envRoot) return envRoot;
      const localRoot = tryEnsureDir(path.resolve(projectRoot, "generated"));
      if (localRoot) return localRoot;
      const tmpRoot = tryEnsureDir(
        path.resolve(process.env.TMPDIR || "/tmp", "aisongmaker", "generated")
      );
      if (tmpRoot) return tmpRoot;
      return path.resolve(projectRoot, "generated");
    };
    GENERATED_BASE = resolveGeneratedBase();
  }
});

// server/storage.ts
var storage_exports = {};
__export(storage_exports, {
  isStorageConfigured: () => isStorageConfigured,
  storageGet: () => storageGet,
  storagePut: () => storagePut
});
import { PutObjectCommand, GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
async function storagePut(relKey, data, contentType = "application/octet-stream") {
  ensureConfig();
  const client = ensureClient();
  const key = normalizeKey(relKey);
  const body = toBuffer(data);
  const command = new PutObjectCommand({
    Bucket: ENV.s3Bucket,
    Key: key,
    Body: body,
    ContentType: contentType
  });
  await client.send(command);
  return {
    key,
    url: buildPublicUrl(key)
  };
}
async function storageGet(relKey, expiresIn = 3600) {
  ensureConfig();
  const key = normalizeKey(relKey);
  if (ENV.s3PublicBaseUrl) {
    return { key, url: buildPublicUrl(key) };
  }
  const client = ensureClient();
  const command = new GetObjectCommand({
    Bucket: ENV.s3Bucket,
    Key: key
  });
  const url = await getSignedUrl(client, command, { expiresIn });
  return { key, url };
}
var s3Client, normalizeKey, toBuffer, buildPublicUrl, ensureConfig, ensureClient, isStorageConfigured;
var init_storage = __esm({
  "server/storage.ts"() {
    "use strict";
    init_env();
    s3Client = null;
    normalizeKey = (relKey) => relKey.replace(/^\/+/, "");
    toBuffer = (data) => {
      if (Buffer.isBuffer(data)) return data;
      if (typeof data === "string") return Buffer.from(data);
      return Buffer.from(data.buffer, data.byteOffset, data.byteLength);
    };
    buildPublicUrl = (key) => {
      if (ENV.s3PublicBaseUrl) {
        return `${ENV.s3PublicBaseUrl.replace(/\/+$/, "")}/${key}`;
      }
      const encoded = key.split("/").map((segment) => encodeURIComponent(segment)).join("/");
      return `https://${ENV.s3Bucket}.s3.${ENV.awsRegion}.amazonaws.com/${encoded}`;
    };
    ensureConfig = () => {
      if (!ENV.s3Bucket || !ENV.awsRegion) {
        throw new Error(
          "S3 storage is not configured. Set S3_BUCKET and AWS_REGION (and credentials if required)."
        );
      }
    };
    ensureClient = () => {
      if (s3Client) return s3Client;
      ensureConfig();
      const credentials = ENV.awsAccessKeyId && ENV.awsSecretAccessKey ? {
        accessKeyId: ENV.awsAccessKeyId,
        secretAccessKey: ENV.awsSecretAccessKey,
        sessionToken: ENV.awsSessionToken || void 0
      } : void 0;
      s3Client = new S3Client({
        region: ENV.awsRegion,
        credentials
      });
      return s3Client;
    };
    isStorageConfigured = () => Boolean(ENV.s3Bucket && ENV.awsRegion);
  }
});

// server/minimaxApi.ts
var minimaxApi_exports = {};
__export(minimaxApi_exports, {
  generateMusic: () => generateMusic,
  pollTaskCompletion: () => pollTaskCompletion
});
import { promises as fs2 } from "fs";
import path2 from "path";
import { gunzipSync, inflateSync } from "node:zlib";
function normalizeSubtype(subtype) {
  if (!subtype) return void 0;
  return subtype.replace(/^x-/, "").toLowerCase();
}
function resolveAudioMetadata(subtype) {
  const normalized = normalizeSubtype(subtype);
  if (!normalized) {
    return { ...DEFAULT_AUDIO_METADATA };
  }
  if (AUDIO_METADATA_BY_SUBTYPE[normalized]) {
    return { ...AUDIO_METADATA_BY_SUBTYPE[normalized] };
  }
  return {
    mimeType: `audio/${normalized}`,
    extension: normalized.replace(/[^a-z0-9]/gi, "") || DEFAULT_AUDIO_METADATA.extension
  };
}
function decodeAudioPayload(rawAudio) {
  let metadata = { ...DEFAULT_AUDIO_METADATA };
  let payload = rawAudio.trim();
  const dataUrlMatch = payload.match(/^data:audio\/([^;]+);base64,(.+)$/);
  if (dataUrlMatch) {
    const [, subtypeRaw, base64Payload] = dataUrlMatch;
    metadata = resolveAudioMetadata(subtypeRaw);
    const buffer = Buffer.from(base64Payload, "base64");
    return {
      buffer: maybeDecompressAudio(buffer),
      metadata
    };
  }
  if (HEX_REGEX.test(payload)) {
    const buffer = Buffer.from(payload, "hex");
    return {
      buffer: maybeDecompressAudio(buffer),
      metadata
    };
  }
  try {
    const sanitized = payload.replace(/\s+/g, "");
    const buffer = Buffer.from(sanitized, "base64");
    return {
      buffer: maybeDecompressAudio(buffer),
      metadata
    };
  } catch (error) {
    throw new Error("Unsupported audio encoding returned by MiniMax");
  }
}
function maybeDecompressAudio(buffer) {
  if (!buffer || buffer.length < 2) {
    return buffer;
  }
  const byte1 = buffer[0];
  const byte2 = buffer[1];
  const isGzip = byte1 === 31 && byte2 === 139;
  const isZlib = byte1 === 120 && [1, 94, 156, 218].includes(byte2);
  try {
    if (isGzip) {
      return gunzipSync(buffer);
    }
    if (isZlib) {
      return inflateSync(buffer);
    }
  } catch (error) {
    console.warn("[MiniMax] Failed to decompress audio payload, using raw buffer:", error);
  }
  return buffer;
}
async function generateMusic(params) {
  const apiKey = process.env.MINIMAX_API_KEY;
  if (!apiKey) {
    return {
      success: false,
      error: "MiniMax API key not configured"
    };
  }
  try {
    let stylePrompt = "";
    if (params.style) {
      stylePrompt = `${params.style} style music`;
    }
    if (params.title) {
      stylePrompt = `${stylePrompt}. Title: "${params.title}"`;
    }
    if (!stylePrompt) {
      stylePrompt = "Create a song";
    }
    const requestBody = {
      model: "music-1.5",
      prompt: stylePrompt,
      audio_setting: {
        sample_rate: 44100,
        bitrate: 256e3,
        format: "mp3"
      }
    };
    if (params.prompt && !params.instrumental) {
      requestBody.lyrics = params.prompt;
    }
    console.log("[MiniMax] Generating music with prompt:", stylePrompt);
    console.log("[MiniMax] Request body:", JSON.stringify(requestBody, null, 2));
    const response = await fetch(`${MINIMAX_API_BASE}?GroupId=${MINIMAX_GROUP_ID}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody)
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error("[MiniMax] API error:", response.status, errorText);
      return {
        success: false,
        error: `API request failed: ${response.status} ${errorText}`
      };
    }
    const data = await response.json();
    console.log("[MiniMax] API response:", JSON.stringify(data, null, 2));
    if (data.base_resp && data.base_resp.status_code !== 0) {
      console.error("[MiniMax] API error response:", data.base_resp);
      return {
        success: false,
        error: data.base_resp.status_msg || "API error"
      };
    }
    if (data.error) {
      console.error("[MiniMax] Error in response:", data.error);
      return {
        success: false,
        error: typeof data.error === "string" ? data.error : JSON.stringify(data.error)
      };
    }
    if (data.data && data.data.audio) {
      const rawAudio = data.data.audio;
      const audioFormat = data.data.audio_format || data.data.format;
      const decodedAudio = decodeAudioPayload(rawAudio);
      const metadata = audioFormat ? resolveAudioMetadata(audioFormat) : decodedAudio.metadata;
      if (!decodedAudio.buffer.length) {
        throw new Error("Received empty audio payload from MiniMax");
      }
      const storage = await Promise.resolve().then(() => (init_storage(), storage_exports));
      if (storage.isStorageConfigured()) {
        const timestamp2 = Date.now();
        const { url: audioUrl } = await storage.storagePut(
          `music/${timestamp2}.${metadata.extension}`,
          decodedAudio.buffer,
          metadata.mimeType
        );
        return {
          success: true,
          audioUrl,
          status: "completed"
        };
      }
      const localUrl = await saveLocalAudio(decodedAudio.buffer, metadata.extension);
      return {
        success: true,
        audioUrl: localUrl,
        status: "completed"
      };
    }
    if (data.task_id) {
      return {
        success: true,
        taskId: data.task_id,
        status: "processing"
      };
    }
    return {
      success: false,
      error: "Unexpected API response format: " + JSON.stringify(data).substring(0, 100)
    };
  } catch (error) {
    console.error("[MiniMax] Error generating music:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
async function pollTaskCompletion(taskId, maxAttempts = 60, intervalMs = 2e3) {
  const apiKey = process.env.MINIMAX_API_KEY;
  if (!apiKey) {
    return {
      success: false,
      error: "MiniMax API key not configured"
    };
  }
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const response = await fetch(
        `${MINIMAX_API_BASE}/${taskId}?GroupId=${MINIMAX_GROUP_ID}`,
        {
          headers: {
            "Authorization": `Bearer ${apiKey}`
          }
        }
      );
      if (!response.ok) {
        console.error("[MiniMax] Poll error:", response.status);
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
        continue;
      }
      const data = await response.json();
      console.log(`[MiniMax] Poll attempt ${attempt + 1}:`, data);
      if (data.status === "Success" || data.status === "completed") {
        return {
          success: true,
          audioUrl: data.audio_url || data.file?.download_url,
          status: "completed"
        };
      }
      if (data.status === "Failed" || data.status === "failed") {
        return {
          success: false,
          error: data.error || "Generation failed",
          status: "failed"
        };
      }
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    } catch (error) {
      console.error("[MiniMax] Poll error:", error);
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }
  return {
    success: false,
    error: "Timeout waiting for music generation",
    status: "failed"
  };
}
async function saveLocalAudio(audioBuffer, extension = DEFAULT_AUDIO_METADATA.extension) {
  const audioDir = ensureGeneratedSubdir(LOCAL_AUDIO_SUBDIR);
  const safeExtension = extension.replace(/[^a-z0-9]/gi, "") || DEFAULT_AUDIO_METADATA.extension;
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${safeExtension}`;
  const filePath = path2.join(audioDir, fileName);
  await fs2.writeFile(filePath, audioBuffer);
  return getGeneratedPublicPath(LOCAL_AUDIO_SUBDIR, fileName);
}
var MINIMAX_API_BASE, MINIMAX_GROUP_ID, DEFAULT_AUDIO_METADATA, HEX_REGEX, AUDIO_METADATA_BY_SUBTYPE, LOCAL_AUDIO_SUBDIR;
var init_minimaxApi = __esm({
  "server/minimaxApi.ts"() {
    "use strict";
    init_paths();
    MINIMAX_API_BASE = "https://api.minimax.io/v1/music_generation";
    MINIMAX_GROUP_ID = "1965003715358236847";
    DEFAULT_AUDIO_METADATA = {
      mimeType: "audio/mpeg",
      extension: "mp3"
    };
    HEX_REGEX = /^[0-9a-fA-F]+$/;
    AUDIO_METADATA_BY_SUBTYPE = {
      mpeg: { mimeType: "audio/mpeg", extension: "mp3" },
      mp3: { mimeType: "audio/mpeg", extension: "mp3" },
      wav: { mimeType: "audio/wav", extension: "wav" },
      wave: { mimeType: "audio/wav", extension: "wav" },
      ogg: { mimeType: "audio/ogg", extension: "ogg" },
      m4a: { mimeType: "audio/mp4", extension: "m4a" },
      mp4: { mimeType: "audio/mp4", extension: "m4a" }
    };
    LOCAL_AUDIO_SUBDIR = "audio";
  }
});

// server/_core/llm.ts
var llm_exports = {};
__export(llm_exports, {
  invokeLLM: () => invokeLLM
});
import Replicate2 from "replicate";
async function invokeLLM(params) {
  const canUseForge = ENV.forgeFeaturesEnabled && !!ENV.forgeApiKey;
  if (canUseForge) {
    return invokeForge(params);
  }
  if (ENV.openaiApiKey) {
    try {
      return await invokeOpenAI(params);
    } catch (error) {
      console.warn("[LLM] OpenAI request failed, attempting fallback:", error);
    }
  }
  if (replicateClient) {
    return invokeReplicate(params);
  }
  console.warn(
    "[LLM] No external LLM provider available, using static fallback lyrics"
  );
  return createFallbackResult(params.messages);
}
var ensureArray, normalizeContentPart, normalizeMessage, normalizeToolChoice, resolveApiUrl, OPENAI_CHAT_COMPLETIONS_URL, replicateClient, normalizeResponseFormat, formatMessagesToPrompt, invokeForge, toOpenAIMessage, resolveOpenAIContent, extractUserPrompt, buildFallbackLyrics, createFallbackResult, invokeOpenAI, invokeReplicate;
var init_llm = __esm({
  "server/_core/llm.ts"() {
    "use strict";
    init_env();
    init_forge();
    ensureArray = (value) => Array.isArray(value) ? value : [value];
    normalizeContentPart = (part) => {
      if (typeof part === "string") {
        return { type: "text", text: part };
      }
      if (part.type === "text") {
        return part;
      }
      if (part.type === "image_url") {
        return part;
      }
      if (part.type === "file_url") {
        return part;
      }
      throw new Error("Unsupported message content part");
    };
    normalizeMessage = (message) => {
      const { role, name, tool_call_id } = message;
      if (role === "tool" || role === "function") {
        const content = ensureArray(message.content).map((part) => typeof part === "string" ? part : JSON.stringify(part)).join("\n");
        return {
          role,
          name,
          tool_call_id,
          content
        };
      }
      const contentParts = ensureArray(message.content).map(normalizeContentPart);
      if (contentParts.length === 1 && contentParts[0].type === "text") {
        return {
          role,
          name,
          content: contentParts[0].text
        };
      }
      return {
        role,
        name,
        content: contentParts
      };
    };
    normalizeToolChoice = (toolChoice, tools) => {
      if (!toolChoice) return void 0;
      if (toolChoice === "none" || toolChoice === "auto") {
        return toolChoice;
      }
      if (toolChoice === "required") {
        if (!tools || tools.length === 0) {
          throw new Error(
            "tool_choice 'required' was provided but no tools were configured"
          );
        }
        if (tools.length > 1) {
          throw new Error(
            "tool_choice 'required' needs a single tool or specify the tool name explicitly"
          );
        }
        return {
          type: "function",
          function: { name: tools[0].function.name }
        };
      }
      if ("name" in toolChoice) {
        return {
          type: "function",
          function: { name: toolChoice.name }
        };
      }
      return toolChoice;
    };
    resolveApiUrl = () => ENV.forgeApiUrl && ENV.forgeApiUrl.trim().length > 0 ? `${ENV.forgeApiUrl.replace(/\/$/, "")}/v1/chat/completions` : "https://forge.manus.im/v1/chat/completions";
    OPENAI_CHAT_COMPLETIONS_URL = "https://api.openai.com/v1/chat/completions";
    replicateClient = process.env.REPLICATE_API_TOKEN && process.env.REPLICATE_API_TOKEN.length > 0 ? new Replicate2({ auth: process.env.REPLICATE_API_TOKEN }) : null;
    normalizeResponseFormat = ({
      responseFormat,
      response_format,
      outputSchema,
      output_schema
    }) => {
      const explicitFormat = responseFormat || response_format;
      if (explicitFormat) {
        if (explicitFormat.type === "json_schema" && !explicitFormat.json_schema?.schema) {
          throw new Error(
            "responseFormat json_schema requires a defined schema object"
          );
        }
        return explicitFormat;
      }
      const schema = outputSchema || output_schema;
      if (!schema) return void 0;
      if (!schema.name || !schema.schema) {
        throw new Error("outputSchema requires both name and schema");
      }
      return {
        type: "json_schema",
        json_schema: {
          name: schema.name,
          schema: schema.schema,
          ...typeof schema.strict === "boolean" ? { strict: schema.strict } : {}
        }
      };
    };
    formatMessagesToPrompt = (messages) => {
      return messages.map((message) => {
        const parts = ensureArray(message.content).map(
          (part) => typeof part === "string" ? part : part.type === "text" ? part.text : JSON.stringify(part)
        ).join("\n");
        const header = message.role === "assistant" ? "Assistant" : message.role === "system" ? "System" : "User";
        return `${header}: ${parts}`;
      }).join("\n\n");
    };
    invokeForge = async (params) => {
      assertForgeEnabled("LLM service");
      if (!ENV.forgeApiKey) {
        throw new Error("Forge API key is not configured");
      }
      const {
        messages,
        tools,
        toolChoice,
        tool_choice,
        outputSchema,
        output_schema,
        responseFormat,
        response_format
      } = params;
      const payload = {
        model: "gemini-2.5-flash",
        messages: messages.map(normalizeMessage)
      };
      if (tools && tools.length > 0) {
        payload.tools = tools;
      }
      const normalizedToolChoice = normalizeToolChoice(
        toolChoice || tool_choice,
        tools
      );
      if (normalizedToolChoice) {
        payload.tool_choice = normalizedToolChoice;
      }
      payload.max_tokens = 32768;
      payload.thinking = {
        budget_tokens: 128
      };
      const normalizedResponseFormat = normalizeResponseFormat({
        responseFormat,
        response_format,
        outputSchema,
        output_schema
      });
      if (normalizedResponseFormat) {
        payload.response_format = normalizedResponseFormat;
      }
      const response = await fetch(resolveApiUrl(), {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${ENV.forgeApiKey}`
        },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `LLM invoke failed: ${response.status} ${response.statusText} \u2013 ${errorText}`
        );
      }
      return await response.json();
    };
    toOpenAIMessage = (message) => {
      const parts = ensureArray(message.content).map(
        (part) => typeof part === "string" ? part : part.type === "text" ? part.text : JSON.stringify(part)
      );
      const content = parts.join("\n").trim();
      if (!content) return null;
      let role;
      switch (message.role) {
        case "system":
          role = "system";
          break;
        case "assistant":
          role = "assistant";
          break;
        default:
          role = "user";
          break;
      }
      return { role, content };
    };
    resolveOpenAIContent = (content) => {
      if (typeof content === "string") return content;
      if (Array.isArray(content)) {
        return content.map(
          (item) => typeof item === "string" ? item : item && typeof item === "object" && "text" in item ? item.text ?? "" : JSON.stringify(item)
        ).join("\n");
      }
      if (content && typeof content === "object" && "text" in content) {
        const maybeText = content.text;
        if (typeof maybeText === "string") return maybeText;
      }
      return "";
    };
    extractUserPrompt = (messages) => {
      for (let i = messages.length - 1; i >= 0; i--) {
        const message = messages[i];
        if (message.role === "system") continue;
        const parts = ensureArray(message.content).map(
          (part) => typeof part === "string" ? part : part.type === "text" ? part.text : JSON.stringify(part)
        );
        const joined = parts.join("\n").trim();
        if (joined.length > 0) {
          return joined;
        }
      }
      return "";
    };
    buildFallbackLyrics = (messages) => {
      const prompt = extractUserPrompt(messages);
      const topic = prompt.split(/\s+/).slice(0, 12).join(" ").trim() || "this moment";
      const hook = topic.charAt(0).toUpperCase().concat(topic.slice(1));
      return [
        "[Intro]",
        `${hook} in the fading city lights`,
        "",
        "[Verse 1]",
        `Walking through the echoes of ${topic}`,
        "Footsteps keeping time with a restless heart",
        "Shadows paint the skyline in silver and gold",
        "Every whispered dream is a brand new start",
        "",
        "[Chorus]",
        `${hook}, we sing it loud`,
        "Raise our hands above the crowd",
        "Every heartbeat finds the sound",
        `${hook}, we're breaking out`,
        "",
        "[Verse 2]",
        "Moonlight on the water, reflections ignite",
        "Promises of tomorrow written in the air",
        "Voices in the night say we'll be alright",
        "Because the fire we carry is always there",
        "",
        "[Bridge]",
        "Hold on tight, the night is ours",
        "Chasing sparks and falling stars",
        "We'll remix the sky into neon art",
        "Turn every pulse into a work of heart",
        "",
        "[Chorus]",
        `${hook}, we sing it loud`,
        "Raise our hands above the crowd",
        "Every heartbeat finds the sound",
        `${hook}, we're breaking out`,
        "",
        "[Outro]",
        `${hook}, echo in the night`,
        "We'll keep dancing till the morning light"
      ].join("\n");
    };
    createFallbackResult = (messages) => {
      const content = buildFallbackLyrics(messages);
      return {
        id: `fallback-${Date.now()}`,
        created: Math.floor(Date.now() / 1e3),
        model: "fallback-lyrics-generator",
        choices: [
          {
            index: 0,
            message: {
              role: "assistant",
              content
            },
            finish_reason: "stop"
          }
        ]
      };
    };
    invokeOpenAI = async (params) => {
      if (!ENV.openaiApiKey) {
        throw new Error("OpenAI API key is not configured");
      }
      const messages = params.messages.map(toOpenAIMessage).filter((message) => message !== null);
      if (messages.length === 0) {
        return createFallbackResult(params.messages);
      }
      const body = JSON.stringify({
        model: "gpt-4o-mini",
        messages,
        temperature: 0.7,
        max_tokens: params.maxTokens ?? params.max_tokens ?? 1024
      });
      const response = await fetch(OPENAI_CHAT_COMPLETIONS_URL, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${ENV.openaiApiKey}`
        },
        body
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `OpenAI request failed: ${response.status} ${response.statusText} \u2013 ${errorText}`
        );
      }
      const completion = await response.json();
      const choice = completion.choices?.[0];
      if (!choice) {
        return createFallbackResult(params.messages);
      }
      const content = resolveOpenAIContent(choice?.message?.content);
      return {
        id: completion.id ?? `openai-${Date.now()}`,
        created: completion.created ?? Math.floor(Date.now() / 1e3),
        model: completion.model ?? "gpt-4o-mini",
        choices: [
          {
            index: choice?.index ?? 0,
            message: {
              role: "assistant",
              content
            },
            finish_reason: choice?.finish_reason ?? null
          }
        ],
        usage: completion.usage ? {
          prompt_tokens: completion.usage.prompt_tokens ?? 0,
          completion_tokens: completion.usage.completion_tokens ?? 0,
          total_tokens: completion.usage.total_tokens ?? 0
        } : void 0
      };
    };
    invokeReplicate = async (params) => {
      if (!replicateClient) {
        throw new Error("Replicate API token is not configured");
      }
      const prompt = `${formatMessagesToPrompt(params.messages)}

Assistant:`;
      try {
        const output = await replicateClient.run(
          "meta/meta-llama-3.1-8b-instruct",
          {
            input: {
              prompt,
              max_tokens: 1024,
              temperature: 0.7,
              top_p: 0.9,
              presence_penalty: 0,
              frequency_penalty: 0
            }
          }
        );
        const content = Array.isArray(output) ? output.join("") : typeof output === "string" ? output : JSON.stringify(output);
        return {
          id: `replicate-${Date.now()}`,
          created: Math.floor(Date.now() / 1e3),
          model: "meta/meta-llama-3.1-8b-instruct",
          choices: [
            {
              index: 0,
              message: {
                role: "assistant",
                content
              },
              finish_reason: "stop"
            }
          ]
        };
      } catch (error) {
        console.warn(
          "[LLM] Replicate request failed, using fallback lyrics:",
          error
        );
        return createFallbackResult(params.messages);
      }
    };
  }
});

// vite.config.ts
var vite_config_exports = {};
__export(vite_config_exports, {
  default: () => vite_config_default
});
import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path3 from "node:path";
import { fileURLToPath as fileURLToPath2 } from "node:url";
import { defineConfig } from "vite";
import { vitePluginManusRuntime } from "vite-plugin-manus-runtime";
var currentDir2, resolveFromRoot, plugins, vite_config_default;
var init_vite_config = __esm({
  "vite.config.ts"() {
    "use strict";
    currentDir2 = path3.dirname(fileURLToPath2(import.meta.url));
    resolveFromRoot = (...segments) => path3.resolve(currentDir2, ...segments);
    plugins = [react(), tailwindcss(), jsxLocPlugin(), vitePluginManusRuntime()];
    vite_config_default = defineConfig({
      plugins,
      resolve: {
        alias: {
          "@": resolveFromRoot("client", "src"),
          "@shared": resolveFromRoot("shared"),
          "@assets": resolveFromRoot("attached_assets")
        }
      },
      envDir: currentDir2,
      root: resolveFromRoot("client"),
      publicDir: resolveFromRoot("client", "public"),
      build: {
        outDir: resolveFromRoot("dist/public"),
        emptyOutDir: true
      },
      server: {
        host: true,
        allowedHosts: [
          ".manuspre.computer",
          ".manus.computer",
          ".manus-asia.computer",
          ".manuscomputer.ai",
          ".manusvm.computer",
          "localhost",
          "127.0.0.1"
        ],
        fs: {
          strict: true,
          deny: ["**/.*"]
        }
      }
    });
  }
});

// server/_core/index.ts
import "dotenv/config";
import express2 from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// shared/const.ts
var COOKIE_NAME = "app_session_id";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var UNAUTHED_ERR_MSG = "Please login (10001)";
var NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";

// server/_core/oauth.ts
init_db();
import { OAuth2Client } from "google-auth-library";

// server/_core/cookies.ts
function isSecureRequest(req) {
  const proto = req.protocol;
  if (proto && proto.toLowerCase() === "https") return true;
  const forwardedProto = req.headers?.["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");
  return protoList.some((item) => item.trim().toLowerCase() === "https");
}
function getSessionCookieOptions(req) {
  const secure = isSecureRequest(req);
  return {
    domain: void 0,
    httpOnly: true,
    path: "/",
    sameSite: secure ? "none" : "lax",
    secure
  };
}

// server/_core/oauth.ts
init_env();

// shared/_core/errors.ts
var HttpError = class extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = "HttpError";
  }
};
var ForbiddenError = (msg) => new HttpError(403, msg);

// server/_core/sdk.ts
init_db();
init_env();
import { parse as parseCookieHeader } from "cookie";
import { SignJWT, jwtVerify } from "jose";
var isNonEmptyString = (value) => typeof value === "string" && value.length > 0;
var SDKServer = class {
  constructor() {
    if (ENV.oauthEnabled && (!ENV.googleClientId || !ENV.googleClientSecret)) {
      console.warn(
        "[OAuth] Google credentials missing; authentication will fail until GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are configured."
      );
    }
  }
  parseCookies(cookieHeader) {
    if (!cookieHeader) {
      return /* @__PURE__ */ new Map();
    }
    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }
  getSessionSecret() {
    const secret = ENV.cookieSecret;
    if (!secret) {
      throw new Error("JWT_SECRET is not configured");
    }
    return new TextEncoder().encode(secret);
  }
  async signSession(payload, options = {}) {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1e3);
    const secretKey = this.getSessionSecret();
    return new SignJWT({
      openId: payload.openId,
      appId: payload.appId,
      name: payload.name
    }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setExpirationTime(expirationSeconds).sign(secretKey);
  }
  async createSessionToken(userId, options = {}) {
    return this.signSession(
      {
        openId: userId,
        appId: ENV.appId || ENV.googleClientId || "app",
        name: options.name || ""
      },
      options
    );
  }
  async ensureDevUser() {
    const fallbackId = ENV.ownerId || "dev-user";
    const fallbackName = ENV.ownerName && ENV.ownerName.trim().length > 0 ? ENV.ownerName : "Developer";
    await upsertUser({
      id: fallbackId,
      name: fallbackName,
      loginMethod: "dev",
      lastSignedIn: /* @__PURE__ */ new Date()
    });
    const user = await getUser(fallbackId);
    if (!user) {
      throw new Error("Failed to provision development user");
    }
    return user;
  }
  async verifySession(cookieValue) {
    if (!cookieValue) {
      console.warn("[Auth] Missing session cookie");
      return null;
    }
    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"]
      });
      const { openId, appId, name } = payload;
      if (!isNonEmptyString(openId) || !isNonEmptyString(appId) || typeof name !== "string") {
        console.warn("[Auth] Session payload missing required fields");
        return null;
      }
      return {
        openId,
        appId,
        name
      };
    } catch (error) {
      console.warn("[Auth] Session verification failed", String(error));
      return null;
    }
  }
  async authenticateRequest(req) {
    if (!ENV.oauthEnabled) {
      console.warn("[Auth] OAuth disabled, using development account");
      return this.ensureDevUser();
    }
    const headers = req?.headers ?? {};
    const rawCookie = headers.cookie;
    const cookieHeader = Array.isArray(rawCookie) ? rawCookie.join("; ") : rawCookie;
    const cookies = this.parseCookies(cookieHeader);
    const sessionCookie = cookies.get(COOKIE_NAME);
    const session = await this.verifySession(sessionCookie);
    if (!session) {
      throw ForbiddenError("Invalid session cookie");
    }
    const sessionUserId = session.openId;
    const signedInAt = /* @__PURE__ */ new Date();
    const user = await getUser(sessionUserId);
    if (!user) {
      console.warn("[Auth] Using session payload because user record is unavailable");
      return {
        id: sessionUserId,
        name: session.name ?? null,
        email: null,
        loginMethod: "oauth",
        role: "user",
        createdAt: /* @__PURE__ */ new Date(),
        lastSignedIn: signedInAt
      };
    }
    try {
      await upsertUser({
        id: user.id,
        lastSignedIn: signedInAt
      });
    } catch (error) {
      console.warn("[Auth] Failed to update lastSignedIn:", error);
    }
    return {
      ...user,
      lastSignedIn: signedInAt
    };
  }
};
var sdk = new SDKServer();

// server/_core/oauth.ts
var getQueryParam = (req, key) => {
  const value = req.query?.[key];
  return typeof value === "string" ? value : void 0;
};
var decodeState = (state) => {
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
var determineRedirectUri = (req) => {
  const headers = req.headers ?? {};
  const forwardedProtoHeader = headers["x-forwarded-proto"];
  const protoCandidate = typeof forwardedProtoHeader === "string" ? forwardedProtoHeader.split(",")[0] : Array.isArray(forwardedProtoHeader) ? forwardedProtoHeader[0] : void 0;
  const proto = protoCandidate ?? req.protocol ?? "http";
  const forwardedHostHeader = headers["x-forwarded-host"];
  const hostCandidate = typeof forwardedHostHeader === "string" ? forwardedHostHeader.split(",")[0] : Array.isArray(forwardedHostHeader) ? forwardedHostHeader[0] : void 0;
  const host = hostCandidate ?? headers.host ?? req.get?.("host") ?? "localhost:3000";
  return `${proto}://${host}/api/oauth/callback`;
};
var setStatus = (res, statusCode) => {
  if (typeof res.status === "function") {
    const result = res.status(statusCode);
    if (result && typeof result === "object") {
      return result;
    }
  }
  return res;
};
var sendJson = (res, statusCode, body) => {
  const target = setStatus(res, statusCode);
  target.json?.(body);
};
var redirect = (res, status, url) => {
  if (typeof res.redirect === "function") {
    try {
      res.redirect(status, url);
      return;
    } catch {
      res.redirect(url);
    }
  }
};
function registerOAuthRoutes(app) {
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
        redirect_uri: redirectUri
      });
      if (!tokens.id_token) {
        throw new Error("Google response did not include an ID token");
      }
      const ticket = await oauthClient.verifyIdToken({
        idToken: tokens.id_token,
        audience: ENV.googleClientId
      });
      const payload = ticket.getPayload();
      if (!payload || !payload.sub) {
        throw new Error("Google ID token payload missing subject");
      }
      await upsertUser({
        id: payload.sub,
        name: payload.name ?? null,
        email: payload.email ?? null,
        loginMethod: "google",
        lastSignedIn: /* @__PURE__ */ new Date()
      });
      const sessionToken = await sdk.createSessionToken(payload.sub, {
        name: payload.name ?? "",
        expiresInMs: ONE_YEAR_MS
      });
      res.cookie?.(
        COOKIE_NAME,
        sessionToken,
        {
          ...getSessionCookieOptions(req),
          maxAge: ONE_YEAR_MS
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

// server/routers.ts
import { z as z2 } from "zod";

// server/_core/systemRouter.ts
import { z } from "zod";

// server/_core/notification.ts
init_env();
init_forge();
import { TRPCError } from "@trpc/server";
var TITLE_MAX_LENGTH = 1200;
var CONTENT_MAX_LENGTH = 2e4;
var trimValue = (value) => value.trim();
var isNonEmptyString2 = (value) => typeof value === "string" && value.trim().length > 0;
var buildEndpointUrl = (baseUrl) => {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(
    "webdevtoken.v1.WebDevService/SendNotification",
    normalizedBase
  ).toString();
};
var validatePayload = (input) => {
  if (!isNonEmptyString2(input.title)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required."
    });
  }
  if (!isNonEmptyString2(input.content)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content is required."
    });
  }
  const title = trimValue(input.title);
  const content = trimValue(input.content);
  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`
    });
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`
    });
  }
  return { title, content };
};
async function notifyOwner(payload) {
  const { title, content } = validatePayload(payload);
  if (!isForgeEnabled()) {
    console.info("[Notification] Forge API disabled; skipping notification delivery.");
    return false;
  }
  if (!ENV.forgeApiUrl) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service URL is not configured."
    });
  }
  if (!ENV.forgeApiKey) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service API key is not configured."
    });
  }
  const endpoint = buildEndpointUrl(ENV.forgeApiUrl);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "content-type": "application/json",
        "connect-protocol-version": "1"
      },
      body: JSON.stringify({ title, content })
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[Notification] Failed to notify owner (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
      );
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[Notification] Error calling notification service:", error);
    return false;
  }
}

// server/_core/trpc.ts
import { initTRPC, TRPCError as TRPCError2 } from "@trpc/server";
import superjson from "superjson";
var t = initTRPC.context().create({
  transformer: superjson
});
var router = t.router;
var publicProcedure = t.procedure;
var requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError2({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user
    }
  });
});
var protectedProcedure = t.procedure.use(requireUser);
var adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError2({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user
      }
    });
  })
);

// server/_core/systemRouter.ts
var systemRouter = router({
  health: publicProcedure.input(
    z.object({
      timestamp: z.number().min(0, "timestamp cannot be negative")
    })
  ).query(() => ({
    ok: true
  })),
  notifyOwner: adminProcedure.input(
    z.object({
      title: z.string().min(1, "title is required"),
      content: z.string().min(1, "content is required")
    })
  ).mutation(async ({ input }) => {
    const delivered = await notifyOwner(input);
    return {
      success: delivered
    };
  })
});

// server/routers.ts
import { nanoid } from "nanoid";

// server/rvcApi.ts
init_db();
init_schema();
import Replicate from "replicate";
import { eq as eq2, like, desc as desc2 } from "drizzle-orm";
var replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN
});
async function convertVoice(params) {
  try {
    const output = await replicate.run(
      "zsxkib/realistic-voice-cloning:a0076ea190fb8c0f8d2c9a22d9e18b5f8d9f8c0f",
      {
        input: {
          song_input: params.songInput,
          rvc_model: params.rvcModel,
          pitch_change: params.pitchChange || "no-change",
          index_rate: params.indexRate ?? 0.5,
          filter_radius: params.filterRadius ?? 3,
          rms_mix_rate: params.rmsMixRate ?? 0.25,
          protect: params.protect ?? 0.33,
          output_format: params.outputFormat || "mp3"
        }
      }
    );
    return {
      audioUrl: output,
      status: "completed"
    };
  } catch (error) {
    console.error("RVC conversion error:", error);
    return {
      audioUrl: "",
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
var VOICE_MODELS = [
  // Popular Female Artists
  {
    id: "taylor-swift",
    name: "Taylor Swift",
    category: "Music",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=taylor&backgroundColor=ffc9c9",
    uses: 52300,
    likes: 1124
  },
  {
    id: "ariana-grande",
    name: "Ariana Grande",
    category: "Music",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=ariana&backgroundColor=f4c2c2",
    uses: 48100,
    likes: 987
  },
  {
    id: "billie-eilish",
    name: "Billie Eilish",
    category: "Music",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=billie&backgroundColor=b8e0d2",
    uses: 45200,
    likes: 892
  },
  {
    id: "lady-gaga",
    name: "Lady Gaga",
    category: "Music",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=gaga&backgroundColor=ffd5dc",
    uses: 41300,
    likes: 834
  },
  {
    id: "adele",
    name: "Adele",
    category: "Music",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=adele&backgroundColor=eac4d5",
    uses: 38900,
    likes: 756
  },
  // Popular Male Artists
  {
    id: "the-weeknd",
    name: "The Weeknd",
    category: "Music",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=weeknd&backgroundColor=b6e3f4",
    uses: 39100,
    likes: 812
  },
  {
    id: "michael-jackson",
    name: "Michael Jackson",
    category: "Music",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=mj&backgroundColor=ffdfbf",
    uses: 36700,
    likes: 723
  },
  {
    id: "ed-sheeran",
    name: "Ed Sheeran",
    category: "Music",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=ed&backgroundColor=ffd4a3",
    uses: 32400,
    likes: 621
  },
  {
    id: "bruno-mars",
    name: "Bruno Mars",
    category: "Music",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=bruno&backgroundColor=c0aede",
    uses: 28900,
    likes: 543
  },
  {
    id: "justin-bieber",
    name: "Justin Bieber",
    category: "Music",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=justin&backgroundColor=d1d4f9",
    uses: 27500,
    likes: 512
  },
  // Rappers
  {
    id: "drake",
    name: "Drake",
    category: "Rapper",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=drake&backgroundColor=ffd5dc",
    uses: 35200,
    likes: 689
  },
  {
    id: "eminem",
    name: "Eminem",
    category: "Rapper",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=eminem&backgroundColor=e0e0e0",
    uses: 31800,
    likes: 634
  },
  {
    id: "kanye-west",
    name: "Kanye West",
    category: "Rapper",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=kanye&backgroundColor=c7ceea",
    uses: 28100,
    likes: 567
  },
  // K-Pop
  {
    id: "jungkook",
    name: "Jungkook (BTS)",
    category: "Music",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=jungkook&backgroundColor=f4e4ba",
    uses: 42700,
    likes: 891
  },
  {
    id: "lisa",
    name: "Lisa (BLACKPINK)",
    category: "Music",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=lisa&backgroundColor=ffd3e1",
    uses: 38400,
    likes: 767
  },
  // Anime Characters
  {
    id: "hatsune-miku",
    name: "Hatsune Miku",
    category: "Anime",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=miku&backgroundColor=b8e0d2",
    uses: 29200,
    likes: 626
  },
  {
    id: "gojo",
    name: "Satoru Gojo",
    category: "Anime",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=gojo&backgroundColor=d4f1f4",
    uses: 22600,
    likes: 455
  },
  // Cartoon Characters
  {
    id: "spongebob",
    name: "SpongeBob SquarePants",
    category: "Cartoon",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=spongebob&backgroundColor=fff3b0",
    uses: 31300,
    likes: 608
  },
  {
    id: "peter-griffin",
    name: "Peter Griffin",
    category: "Cartoon",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=peter&backgroundColor=e8f4f8",
    uses: 25800,
    likes: 512
  },
  // Other Popular
  {
    id: "minecraft-villager",
    name: "Minecraft Villager",
    category: "Game",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=villager&backgroundColor=a8dadc",
    uses: 62100,
    likes: 823
  }
];
async function getVoicesByCategory(category) {
  const db = await getDb();
  if (!db) return [];
  if (!category || category === "All") {
    const models2 = await db.select().from(voiceModels).orderBy(desc2(voiceModels.uses));
    return models2.map((m) => ({
      id: m.id,
      name: m.name,
      category: m.category,
      avatar: m.avatarUrl || "",
      uses: m.uses || 0,
      likes: m.likes || 0
    }));
  }
  const models = await db.select().from(voiceModels).where(eq2(voiceModels.category, category)).orderBy(desc2(voiceModels.uses));
  return models.map((m) => ({
    id: m.id,
    name: m.name,
    category: m.category,
    avatar: m.avatarUrl || "",
    uses: m.uses || 0,
    likes: m.likes || 0
  }));
}
async function getTrendingVoices(limit = 5) {
  const db = await getDb();
  if (!db) return [];
  const models = await db.select().from(voiceModels).where(eq2(voiceModels.isTrending, 1)).orderBy(desc2(voiceModels.uses)).limit(limit);
  return models.map((m) => ({
    id: m.id,
    name: m.name,
    category: m.category,
    avatar: m.avatarUrl || "",
    uses: m.uses || 0,
    likes: m.likes || 0
  }));
}
async function searchVoices(query) {
  const db = await getDb();
  if (!db) return [];
  const models = await db.select().from(voiceModels).where(like(voiceModels.name, `%${query}%`)).orderBy(desc2(voiceModels.uses));
  return models.map((m) => ({
    id: m.id,
    name: m.name,
    category: m.category,
    avatar: m.avatarUrl || "",
    uses: m.uses || 0,
    likes: m.likes || 0
  }));
}

// server/routers.ts
init_db();
init_env();
var MAX_LYRIC_DURATION_MINUTES = 4;
var ESTIMATED_WORDS_PER_MINUTE = 120;
var MAX_LYRIC_WORDS = MAX_LYRIC_DURATION_MINUTES * ESTIMATED_WORDS_PER_MINUTE;
var countWords = (text2) => text2.trim().split(/\s+/).filter(Boolean).length;
var trimLyricsToWordLimit = (text2) => {
  const original = text2.trim();
  let trimmed = original;
  let words = countWords(trimmed);
  if (words <= MAX_LYRIC_WORDS) {
    return trimmed;
  }
  const lines = trimmed.split(/\r?\n/);
  while (lines.length > 0 && words > MAX_LYRIC_WORDS) {
    lines.pop();
    trimmed = lines.join("\n").trim();
    words = countWords(trimmed);
  }
  if (!trimmed) {
    trimmed = original;
    words = countWords(trimmed);
  }
  if (words > MAX_LYRIC_WORDS || !trimmed) {
    trimmed = original.split(/\s+/).slice(0, MAX_LYRIC_WORDS).join(" ");
  }
  return trimmed.trim();
};
var appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      const resAny = ctx.res;
      resAny.clearCookie?.(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true
      };
    })
  }),
  music: router({
    generate: protectedProcedure.input(
      z2.object({
        prompt: z2.string(),
        title: z2.string(),
        style: z2.string(),
        model: z2.enum(["V5", "V4_5PLUS", "V4_5", "V4", "V3_5"]),
        customMode: z2.boolean(),
        instrumental: z2.boolean()
      })
    ).mutation(async ({ ctx, input }) => {
      const { createMusicTrack: createMusicTrack2, updateMusicTrack: updateMusicTrack2 } = await Promise.resolve().then(() => (init_db(), db_exports));
      const { generateMusic: generateMusic2, pollTaskCompletion: pollTaskCompletion2 } = await Promise.resolve().then(() => (init_minimaxApi(), minimaxApi_exports));
      const trackId = `track_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await createMusicTrack2({
        id: trackId,
        userId: ctx.user.id,
        title: input.title,
        prompt: input.prompt,
        style: input.style,
        model: input.model,
        instrumental: input.instrumental ? "yes" : "no",
        status: "pending"
      });
      (async () => {
        try {
          console.log(`[Music Generation] Starting generation for track ${trackId}`);
          console.log(`[Music Generation] Input:`, JSON.stringify(input, null, 2));
          const result = await generateMusic2({
            prompt: input.prompt,
            title: input.title,
            style: input.style,
            instrumental: input.instrumental
          });
          console.log(`[Music Generation] API result for ${trackId}:`, JSON.stringify(result, null, 2));
          if (!result.success) {
            console.error(`[Music Generation] Generation failed for ${trackId}:`, result.error);
            throw new Error(result.error || "Failed to start generation");
          }
          if (result.audioUrl) {
            console.log(`[Music Generation] Audio URL received for ${trackId}:`, result.audioUrl);
            await updateMusicTrack2(trackId, {
              audioUrl: result.audioUrl,
              status: "completed"
            });
            console.log(`[Music Generation] Track ${trackId} marked as completed`);
          } else if (result.taskId) {
            console.log(`[Music Generation] Task ID received for ${trackId}:`, result.taskId);
            await updateMusicTrack2(trackId, {
              taskId: result.taskId,
              status: "processing"
            });
            console.log(`[Music Generation] Starting polling for ${trackId}`);
            const taskResult = await pollTaskCompletion2(result.taskId);
            console.log(`[Music Generation] Polling result for ${trackId}:`, JSON.stringify(taskResult, null, 2));
            if (taskResult.success && taskResult.audioUrl) {
              console.log(`[Music Generation] Audio URL from polling for ${trackId}:`, taskResult.audioUrl);
              await updateMusicTrack2(trackId, {
                audioUrl: taskResult.audioUrl,
                status: "completed"
              });
              console.log(`[Music Generation] Track ${trackId} marked as completed after polling`);
            } else {
              console.error(`[Music Generation] Polling failed for ${trackId}:`, taskResult.error);
              await updateMusicTrack2(trackId, {
                status: "failed"
              });
            }
          } else {
            console.error(`[Music Generation] No audio or task ID in response for ${trackId}`);
            throw new Error("No audio or task ID in response");
          }
        } catch (error) {
          console.error(`[Music Generation] Error for ${trackId}:`, error);
          console.error(`[Music Generation] Error stack:`, error instanceof Error ? error.stack : "No stack trace");
          try {
            await updateMusicTrack2(trackId, {
              status: "failed"
            });
          } catch (updateError) {
            console.error(`[Music Generation] Failed to update track status:`, updateError);
          }
        }
      })().catch((err) => {
        console.error(`[Music Generation] Unhandled error in background process for ${trackId}:`, err);
      });
      return { success: true, trackId };
    }),
    getHistory: protectedProcedure.query(async ({ ctx }) => {
      const { getUserMusicTracks: getUserMusicTracks2 } = await Promise.resolve().then(() => (init_db(), db_exports));
      return getUserMusicTracks2(ctx.user.id);
    }),
    getById: protectedProcedure.input(z2.object({ id: z2.string() })).query(async ({ ctx, input }) => {
      const { getMusicTrackById: getMusicTrackById2 } = await Promise.resolve().then(() => (init_db(), db_exports));
      const track = await getMusicTrackById2(input.id);
      if (track && track.userId !== ctx.user.id) {
        throw new Error("Unauthorized");
      }
      return track;
    }),
    generateLyrics: protectedProcedure.input(
      z2.object({
        style: z2.string(),
        title: z2.string().optional(),
        mood: z2.string().optional()
      })
    ).mutation(async ({ input }) => {
      const canGenerateLyrics = ENV.forgeFeaturesEnabled && !!ENV.forgeApiKey || !!ENV.openaiApiKey || !!process.env.REPLICATE_API_TOKEN;
      if (!canGenerateLyrics) {
        throw new Error("Lyrics generation is not configured.");
      }
      const { invokeLLM: invokeLLM2 } = await Promise.resolve().then(() => (init_llm(), llm_exports));
      const prompt = `You are a professional songwriter. Generate creative and engaging song lyrics in the ${input.style} style.${input.title ? ` The song title is "${input.title}".` : ""}${input.mood ? ` The mood/theme should be: ${input.mood}` : ""}

Generate complete song lyrics with proper structure including [Intro], [Verse], [Chorus], [Bridge], etc. tags.
Make the lyrics emotional, memorable, and suitable for the ${input.style} genre.
${input.title ? "" : "Also suggest a catchy title for the song."}
Ensure the lyrics can be performed within ${MAX_LYRIC_DURATION_MINUTES} minutes (about ${MAX_LYRIC_WORDS} words). Keep sections concise and avoid overly long verses.`;
      const songwriterSystemPrompt = "You are a professional songwriter who creates engaging, emotional, and memorable lyrics.";
      try {
        const response = await invokeLLM2({
          messages: [
            {
              role: "system",
              content: songwriterSystemPrompt
            },
            {
              role: "user",
              content: prompt
            }
          ]
        });
        const content = response.choices[0]?.message?.content;
        const contentText = typeof content === "string" ? content : "";
        let generatedTitle = input.title;
        if (!generatedTitle) {
          const titleMatch = contentText.match(/Title:\s*["']?([^"'\n]+)["']?/i);
          if (titleMatch) {
            generatedTitle = titleMatch[1].trim();
          }
        }
        let lyrics = contentText.replace(/Title:\s*["']?[^"'\n]+["']?\n*/i, "").trim();
        let wordCount = countWords(lyrics);
        if (wordCount > MAX_LYRIC_WORDS) {
          try {
            const shortenResponse = await invokeLLM2({
              messages: [
                {
                  role: "system",
                  content: songwriterSystemPrompt
                },
                {
                  role: "user",
                  content: `The following lyrics are approximately ${wordCount} words long, which is longer than the allowed ${MAX_LYRIC_WORDS} words (about ${MAX_LYRIC_DURATION_MINUTES} minutes of music). Rewrite them to fit within the limit while keeping the same structure and emotional tone. Return only the revised lyrics with their section headings.

${lyrics}`
                }
              ]
            });
            const shortenContent = shortenResponse.choices[0]?.message?.content;
            const shortenText = typeof shortenContent === "string" ? shortenContent : "";
            if (shortenText.trim()) {
              const shortenedTitleMatch = shortenText.match(/Title:\s*["']?([^"'\n]+)["']?/i);
              if (shortenedTitleMatch) {
                generatedTitle = generatedTitle ?? shortenedTitleMatch[1].trim();
              }
              const shortenedLyrics = shortenText.replace(/Title:\s*["']?[^"'\n]+["']?\n*/i, "").trim();
              if (shortenedLyrics) {
                lyrics = shortenedLyrics;
                wordCount = countWords(lyrics);
              }
            }
          } catch (shortenError) {
            console.warn("[LLM] Failed to shorten lyrics to time limit:", shortenError);
          }
        }
        if (wordCount > MAX_LYRIC_WORDS) {
          lyrics = trimLyricsToWordLimit(lyrics);
        }
        return {
          lyrics,
          title: generatedTitle
        };
      } catch (error) {
        console.error("[LLM] Failed to generate lyrics:", error);
        throw new Error("Failed to generate lyrics");
      }
    })
  }),
  // Voice cover router
  voiceCover: router({
    // Get all voice models
    getVoices: publicProcedure.input(z2.object({ category: z2.string().optional() }).optional()).query(({ input }) => {
      return getVoicesByCategory(input?.category);
    }),
    // Get trending voices
    getTrending: publicProcedure.query(() => {
      return getTrendingVoices(5);
    }),
    // Search voices
    search: publicProcedure.input(z2.object({ query: z2.string() })).query(({ input }) => {
      return searchVoices(input.query);
    }),
    // Get voice model by ID
    getVoiceById: publicProcedure.input(z2.object({ id: z2.string() })).query(({ input }) => {
      return VOICE_MODELS.find((v) => v.id === input.id);
    }),
    // Create voice cover
    create: protectedProcedure.input(
      z2.object({
        voiceModelId: z2.string(),
        audioUrl: z2.string(),
        pitchChange: z2.enum(["no-change", "male-to-female", "female-to-male"]).optional()
      })
    ).mutation(async ({ ctx, input }) => {
      const voiceModel = VOICE_MODELS.find((v) => v.id === input.voiceModelId);
      if (!voiceModel) {
        throw new Error("Voice model not found");
      }
      const coverId = nanoid();
      await createVoiceCover({
        id: coverId,
        userId: ctx.user.id,
        voiceModelId: input.voiceModelId,
        voiceModelName: voiceModel.name,
        originalAudioUrl: input.audioUrl,
        status: "processing",
        pitchChange: input.pitchChange || "no-change"
      });
      const result = await convertVoice({
        songInput: input.audioUrl,
        rvcModel: voiceModel.id,
        pitchChange: input.pitchChange
      });
      await updateVoiceCover(coverId, {
        convertedAudioUrl: result.audioUrl,
        status: result.status
      });
      return {
        id: coverId,
        audioUrl: result.audioUrl,
        status: result.status
      };
    }),
    // Get user's voice covers
    getUserCovers: protectedProcedure.query(async ({ ctx }) => {
      return await getUserVoiceCovers(ctx.user.id);
    })
  })
});

// server/_core/context.ts
async function createContext(opts) {
  const requestUrl = typeof opts.req.url === "string" ? opts.req.url : "(unknown)";
  console.log("[Context] Creating context for request:", requestUrl);
  let user = null;
  try {
    console.log("[Context] Attempting authentication...");
    user = await Promise.race([
      sdk.authenticateRequest(opts.req),
      new Promise(
        (_, reject) => setTimeout(() => reject(new Error("Authentication timeout")), 3e3)
      )
    ]);
    console.log("[Context] Authentication successful");
  } catch (error) {
    console.log("[Context] Authentication failed (expected for public routes):", String(error).substring(0, 100));
    user = null;
  }
  console.log("[Context] Context created");
  return {
    req: opts.req,
    res: opts.res,
    user
  };
}

// server/_core/vite.ts
import express from "express";
import fs3 from "fs";
import { nanoid as nanoid2 } from "nanoid";
import path4 from "path";
import cryptoNative from "node:crypto";
import { fileURLToPath as fileURLToPath3 } from "node:url";
var currentDir3 = path4.dirname(fileURLToPath3(import.meta.url));
var resolveFromRoot2 = (...segments) => path4.resolve(currentDir3, ...segments);
var normalizeHashInput = (input) => {
  if (typeof input === "string") return input;
  if (ArrayBuffer.isView(input)) {
    return Buffer.from(input.buffer, input.byteOffset, input.byteLength);
  }
  if (input instanceof ArrayBuffer) {
    return Buffer.from(input);
  }
  throw new TypeError("Unsupported data type for crypto.hash");
};
var ensureCryptoHash = () => {
  const cryptoGlobal = globalThis.crypto;
  const ensure = (target) => {
    if (typeof target.hash === "function") return;
    Object.defineProperty(target, "hash", {
      value: (algorithm, input, encoding) => {
        const hash = cryptoNative.createHash(algorithm);
        hash.update(normalizeHashInput(input));
        return encoding ? hash.digest(encoding) : hash.digest();
      },
      configurable: true,
      writable: true
    });
  };
  if (cryptoGlobal) ensure(cryptoGlobal);
  ensure(cryptoNative);
};
ensureCryptoHash();
async function setupVite(app, server) {
  console.log("[Vite] Setting up Vite dev server...");
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  try {
    const { createServer: createViteServer } = await import("vite");
    const { default: viteConfig } = await Promise.resolve().then(() => (init_vite_config(), vite_config_exports));
    const vite = await createViteServer({
      ...viteConfig,
      configFile: false,
      server: serverOptions,
      appType: "custom"
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
        const clientTemplate = resolveFromRoot2("..", "..", "client", "index.html");
        let template = await fs3.promises.readFile(clientTemplate, "utf-8");
        template = template.replace(
          `src="/src/main.tsx"`,
          `src="/src/main.tsx?v=${nanoid2()}"`
        );
        const page = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(page);
      } catch (e) {
        console.error("[Vite] Error serving page:", e);
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
    console.log("[Vite] Setup complete");
  } catch (error) {
    console.error("[Vite] Failed to setup Vite:", error);
    throw error;
  }
}
function serveStatic(app) {
  const distPath = process.env.NODE_ENV === "development" ? resolveFromRoot2("..", "..", "dist", "public") : resolveFromRoot2("public");
  if (!fs3.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app.use(express.static(distPath));
  app.use("*", (_req, res) => {
    res.sendFile(path4.resolve(distPath, "index.html"));
  });
}

// server/_core/index.ts
init_paths();
init_env();
import { webcrypto } from "node:crypto";
if (typeof globalThis.crypto === "undefined") {
  globalThis.crypto = webcrypto;
}
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}
async function findAvailablePort(startPort = 3e3) {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}
async function startServer() {
  console.log("[Debug] ENABLE_OAUTH:", process.env.ENABLE_OAUTH);
  console.log("[Debug] ENV.oauthEnabled:", ENV.oauthEnabled);
  console.log(
    "[Debug] DATABASE_URL present:",
    typeof process.env.DATABASE_URL === "string" && process.env.DATABASE_URL.trim().length > 0
  );
  console.log(
    "[Debug] ENV.databaseUrl length:",
    ENV.databaseUrl ? ENV.databaseUrl.length : 0
  );
  const app = express2();
  const server = createServer(app);
  const generatedDir = ensureGeneratedSubdir();
  app.use("/generated", express2.static(generatedDir));
  app.use((req, res, next) => {
    console.log(`[Request] ${req.method} ${req.url}`);
    next();
  });
  app.use(express2.json({ limit: "50mb" }));
  app.use(express2.urlencoded({ limit: "50mb", extended: true }));
  registerOAuthRoutes(app);
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext
    })
  );
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);
  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }
  server.listen(port, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${port}/`);
    console.log(`Server is ready to accept connections`);
  });
  server.on("connection", (socket) => {
    console.log("[Server] New connection received");
  });
  server.on("error", (error) => {
    console.error("[Server] Server error:", error);
  });
}
startServer().catch(console.error);
