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
var schema_exports = {};
__export(schema_exports, {
  musicTracks: () => musicTracks,
  users: () => users,
  voiceCovers: () => voiceCovers,
  voiceModels: () => voiceModels
});
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
      imageUrl: text("imageUrl"),
      status: mysqlEnum("status", ["pending", "processing", "completed", "failed"]).default("pending").notNull(),
      createdAt: timestamp("createdAt").defaultNow()
    });
    voiceCovers = mysqlTable("voice_covers", {
      id: varchar("id", { length: 64 }).primaryKey(),
      userId: varchar("userId", { length: 64 }).notNull(),
      voiceModelId: varchar("voiceModelId", { length: 64 }).notNull(),
      voiceModelName: varchar("voiceModelName", { length: 128 }).notNull(),
      songTitle: varchar("songTitle", { length: 256 }),
      avatarUrl: text("avatarUrl"),
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
    console.log(`[Database] updateVoiceCover called with id: ${id}, updates:`, JSON.stringify(updates));
    console.log(`[Database] updates keys:`, Object.keys(updates));
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
    if (params.gender && params.gender !== "random" && !params.instrumental) {
      const voiceStyle = params.gender === "f" ? "female vocals" : "male vocals";
      stylePrompt = stylePrompt ? `${stylePrompt}, ${voiceStyle}` : voiceStyle;
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

// server/_core/imageGenerator.ts
var imageGenerator_exports = {};
__export(imageGenerator_exports, {
  generateSongArtwork: () => generateSongArtwork
});
import Replicate2 from "replicate";
async function generateSongArtwork(options) {
  const { title, style = "" } = options;
  try {
    console.log(`[Image Generator] Generating artwork for: "${title}" with style: "${style}"`);
    const prompt = constructImagePrompt(title, style);
    console.log(`[Image Generator] Using prompt: "${prompt}"`);
    const output = await replicate2.run(
      "black-forest-labs/flux-schnell",
      {
        input: {
          prompt,
          num_outputs: 1,
          aspect_ratio: "1:1",
          output_format: "png",
          output_quality: 90
        }
      }
    );
    console.log("[Image Generator] Replicate output type:", typeof output);
    console.log("[Image Generator] Replicate raw output:", output);
    let imageUrl;
    if (Array.isArray(output) && output.length > 0) {
      const firstOutput = output[0];
      if (firstOutput && typeof firstOutput.toString === "function") {
        const urlString = firstOutput.toString();
        if (urlString && urlString.startsWith("http")) {
          imageUrl = urlString;
        }
      } else if (firstOutput && typeof firstOutput === "object" && "url" in firstOutput && typeof firstOutput.url === "function") {
        imageUrl = firstOutput.url();
      } else if (firstOutput && typeof firstOutput === "object" && "url" in firstOutput && typeof firstOutput.url === "string") {
        imageUrl = firstOutput.url;
      } else if (typeof firstOutput === "string") {
        imageUrl = firstOutput;
      }
    } else if (typeof output === "string") {
      imageUrl = output;
    } else if (output && typeof output === "object") {
      if (typeof output.toString === "function") {
        const urlString = output.toString();
        if (urlString && urlString.startsWith("http")) {
          imageUrl = urlString;
        }
      }
      if (!imageUrl && "url" in output) {
        if (typeof output.url === "function") {
          imageUrl = output.url();
        } else if (typeof output.url === "string") {
          imageUrl = output.url;
        }
      }
    }
    console.log("[Image Generator] Extracted URL:", imageUrl);
    if (!imageUrl || typeof imageUrl !== "string" || !imageUrl.startsWith("http")) {
      console.error("[Image Generator] Failed to extract valid image URL from output:", output);
      return void 0;
    }
    console.log(`[Image Generator] Successfully generated artwork: ${imageUrl}`);
    return imageUrl;
  } catch (error) {
    console.error("[Image Generator] Error generating artwork:", error);
    return void 0;
  }
}
function constructImagePrompt(title, style) {
  const basePrompt = "album cover art, professional music artwork, high quality, artistic";
  const cleanTitle = title.trim();
  const styleKeywords = style.toLowerCase().split(",").map((s) => s.trim()).filter((s) => s.length > 0);
  let prompt = `${basePrompt}, inspired by "${cleanTitle}"`;
  if (styleKeywords.length > 0) {
    const visualStyles = styleKeywords.map((keyword) => getVisualStyleForMusicGenre(keyword)).filter(Boolean).join(", ");
    if (visualStyles) {
      prompt += `, ${visualStyles}`;
    }
  }
  prompt += ", vibrant colors, modern design, eye-catching, professional photography";
  return prompt;
}
function getVisualStyleForMusicGenre(genre) {
  const genreMap = {
    // Genres
    "pop": "colorful, bright, energetic, contemporary",
    "rock": "bold, edgy, dramatic lighting, powerful",
    "jazz": "sophisticated, moody, noir aesthetic, elegant",
    "classical": "elegant, timeless, refined, orchestral",
    "electronic": "futuristic, neon lights, digital art, cyberpunk",
    "hip hop": "urban, street art, bold typography, modern",
    "rap": "urban, street style, bold, contemporary",
    "country": "rustic, warm tones, americana, natural",
    "blues": "moody, vintage, soulful, atmospheric",
    "metal": "dark, intense, dramatic, powerful",
    "folk": "natural, organic, earthy tones, acoustic",
    "indie": "artistic, alternative, creative, unique",
    "r&b": "smooth, sophisticated, soulful, stylish",
    "soul": "warm, emotional, vintage aesthetic, groovy",
    "funk": "groovy, colorful, retro, vibrant",
    "disco": "glittery, retro, colorful, dance floor",
    "reggae": "tropical, warm colors, relaxed, island vibes",
    "punk": "rebellious, raw, DIY aesthetic, bold",
    "edm": "neon, energetic, festival vibes, electric",
    "house": "club aesthetic, neon lights, energetic, modern",
    "techno": "industrial, minimal, futuristic, dark",
    "ambient": "atmospheric, dreamy, ethereal, peaceful",
    "trap": "urban, modern, bold, street style",
    "dubstep": "dark, bass-heavy aesthetic, futuristic, intense",
    // Moods
    "happy": "bright, cheerful, uplifting, sunny",
    "sad": "melancholic, blue tones, emotional, moody",
    "energetic": "dynamic, vibrant, action-packed, lively",
    "calm": "peaceful, serene, soft colors, tranquil",
    "romantic": "dreamy, soft focus, warm lighting, intimate",
    "dark": "noir, shadows, mysterious, dramatic",
    "uplifting": "bright, inspiring, hopeful, radiant",
    "melancholic": "moody, atmospheric, emotional, somber",
    "aggressive": "intense, powerful, bold, dramatic",
    "chill": "relaxed, cool tones, laid-back, smooth",
    "dramatic": "theatrical, intense lighting, powerful, epic",
    "mysterious": "enigmatic, shadows, intriguing, dark",
    "nostalgic": "vintage, retro, warm tones, memories",
    "dreamy": "ethereal, soft focus, surreal, floating",
    // Scenarios
    "party": "festive, colorful, energetic, celebration",
    "workout": "dynamic, powerful, motivating, intense",
    "study": "focused, calm, minimal, peaceful",
    "sleep": "peaceful, dark blue, dreamy, tranquil",
    "driving": "road trip, freedom, open road, adventure",
    "beach": "tropical, sunny, ocean vibes, relaxed",
    "night": "nocturnal, city lights, mysterious, atmospheric",
    "morning": "sunrise, fresh, bright, new beginnings",
    "rain": "moody, atmospheric, water droplets, cozy",
    "sunset": "golden hour, warm colors, beautiful, peaceful"
  };
  if (genreMap[genre]) {
    return genreMap[genre];
  }
  for (const [key, value] of Object.entries(genreMap)) {
    if (genre.includes(key) || key.includes(genre)) {
      return value;
    }
  }
  return "";
}
var replicate2;
var init_imageGenerator = __esm({
  "server/_core/imageGenerator.ts"() {
    "use strict";
    replicate2 = new Replicate2({
      auth: process.env.REPLICATE_API_TOKEN
    });
  }
});

// server/_core/llm.ts
var llm_exports = {};
__export(llm_exports, {
  invokeLLM: () => invokeLLM
});
import Replicate3 from "replicate";
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
    replicateClient = process.env.REPLICATE_API_TOKEN && process.env.REPLICATE_API_TOKEN.length > 0 ? new Replicate3({ auth: process.env.REPLICATE_API_TOKEN }) : null;
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
      const styleMatch = prompt.match(/in the (\w+) style/i);
      const style = styleMatch ? styleMatch[1] : "music";
      const topic = style.toLowerCase();
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
import { z as z3 } from "zod";

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
import { nanoid as nanoid3 } from "nanoid";

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
    console.log("[RVC] Starting Replicate API call with params:", {
      rvcModel: params.rvcModel,
      songInput: params.songInput,
      pitchChange: params.pitchChange
    });
    const rawOutput = await replicate.run(
      "zsxkib/realistic-voice-cloning:0a9c7c558af4c0f20667c1bd1260ce32a2879944a0b9e44e1398660c077b1550",
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
    console.log("[RVC] Raw output from Replicate:", rawOutput);
    console.log("[RVC] Raw output type:", typeof rawOutput);
    console.log("[RVC] Raw output constructor:", rawOutput?.constructor?.name);
    const output = rawOutput;
    console.log("[RVC] Replicate output type:", typeof output);
    console.log("[RVC] Replicate output:", JSON.stringify(output));
    let audioUrl = "";
    if (typeof output === "string") {
      audioUrl = output;
    } else if (Array.isArray(output) && output.length > 0) {
      const first = output[0];
      if (typeof first === "string") {
        audioUrl = first;
      } else if (first && typeof first === "object" && "url" in first && typeof first.url === "string") {
        audioUrl = first.url;
      }
    } else if (output && typeof output === "object") {
      const obj = output;
      if ("url" in obj && typeof obj.url === "string") {
        audioUrl = obj.url;
      } else if (typeof obj.toString === "function" && obj.toString() !== "[object Object]") {
        audioUrl = obj.toString();
      }
    }
    console.log("[RVC] Extracted audio URL:", audioUrl);
    if (!audioUrl || audioUrl === "" || audioUrl.startsWith("[Function")) {
      console.error("[RVC] Failed to extract valid audio URL from output:", output);
      throw new Error("Failed to extract audio URL from Replicate response");
    }
    return {
      audioUrl,
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
      likes: m.likes || 0,
      demoAudioUrl: m.demoAudioUrl
    }));
  }
  const models = await db.select().from(voiceModels).where(eq2(voiceModels.category, category)).orderBy(desc2(voiceModels.uses));
  return models.map((m) => ({
    id: m.id,
    name: m.name,
    category: m.category,
    avatar: m.avatarUrl || "",
    uses: m.uses || 0,
    likes: m.likes || 0,
    demoAudioUrl: m.demoAudioUrl
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
    likes: m.likes || 0,
    demoAudioUrl: m.demoAudioUrl
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
    likes: m.likes || 0,
    demoAudioUrl: m.demoAudioUrl
  }));
}

// server/routers.ts
init_db();

// server/audioUtils.ts
import { getAudioDurationInSeconds } from "get-audio-duration";
import { createWriteStream } from "fs";
import { unlink } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { randomBytes } from "crypto";
async function getAudioDuration(audioUrl) {
  let tempFilePath = null;
  try {
    const tempFileName = `audio-${randomBytes(16).toString("hex")}.mp3`;
    tempFilePath = join(tmpdir(), tempFileName);
    console.log(`[Audio Utils] Downloading audio from ${audioUrl}`);
    const response = await fetch(audioUrl);
    if (!response.ok) {
      throw new Error(`Failed to download audio: ${response.statusText}`);
    }
    const fileStream = createWriteStream(tempFilePath);
    const buffer = await response.arrayBuffer();
    fileStream.write(Buffer.from(buffer));
    fileStream.end();
    await new Promise((resolve, reject) => {
      fileStream.on("finish", resolve);
      fileStream.on("error", reject);
    });
    console.log(`[Audio Utils] Getting duration from ${tempFilePath}`);
    const duration = await getAudioDurationInSeconds(tempFilePath);
    console.log(`[Audio Utils] Duration: ${duration} seconds`);
    return Math.round(duration);
  } catch (error) {
    console.error("[Audio Utils] Error getting audio duration:", error);
    return 0;
  } finally {
    if (tempFilePath) {
      try {
        await unlink(tempFilePath);
        console.log(`[Audio Utils] Cleaned up temp file ${tempFilePath}`);
      } catch (err) {
        console.error(`[Audio Utils] Failed to clean up temp file:`, err);
      }
    }
  }
}

// server/routers.ts
init_schema();
init_env();
import { eq as eq3 } from "drizzle-orm";

// server/uploadRouter.ts
init_storage();
import { z as z2 } from "zod";
import { nanoid } from "nanoid";
var uploadRouter = router({
  // Upload audio file for voice cover
  uploadAudio: protectedProcedure.input(
    z2.object({
      fileName: z2.string(),
      fileData: z2.string(),
      // base64 encoded
      contentType: z2.string()
    })
  ).mutation(async ({ input }) => {
    const buffer = Buffer.from(input.fileData, "base64");
    const ext = input.fileName.split(".").pop() || "mp3";
    const key = `voice-covers/input-${nanoid()}.${ext}`;
    const result = await storagePut(key, buffer, input.contentType);
    return {
      url: result.url,
      key: result.key
    };
  })
});

// server/youtubeDownloader.ts
init_storage();
import { exec } from "child_process";
import { promisify } from "util";
import { unlink as unlink2 } from "fs/promises";
import { nanoid as nanoid2 } from "nanoid";
var execAsync = promisify(exec);
async function downloadYouTubeAudio(youtubeUrl) {
  const tempId = nanoid2();
  const tempFile = `/tmp/youtube-${tempId}.mp3`;
  let videoTitle = "Unknown Title";
  try {
    const { stdout } = await execAsync(`yt-dlp --print "%(title)s" "${youtubeUrl}"`, { timeout: 1e4 });
    videoTitle = stdout.trim();
    console.log(`[YouTube] Video title: ${videoTitle}`);
  } catch (error) {
    console.warn(`[YouTube] Failed to get video title:`, error instanceof Error ? error.message : String(error));
  }
  const strategies = [
    // Strategy 1: Use android client
    `yt-dlp --extractor-args "youtube:player_client=android" -x --audio-format mp3 --audio-quality 0 -o "${tempFile}" "${youtubeUrl}"`,
    // Strategy 2: Use ios client
    `yt-dlp --extractor-args "youtube:player_client=ios" -x --audio-format mp3 --audio-quality 0 -o "${tempFile}" "${youtubeUrl}"`,
    // Strategy 3: Use web client with different user agent
    `yt-dlp --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" -x --audio-format mp3 --audio-quality 0 -o "${tempFile}" "${youtubeUrl}"`,
    // Strategy 4: Basic download
    `yt-dlp -x --audio-format mp3 --audio-quality 0 -o "${tempFile}" "${youtubeUrl}"`
  ];
  let lastError = null;
  for (let i = 0; i < strategies.length; i++) {
    try {
      console.log(`[YouTube] Trying strategy ${i + 1}/${strategies.length}`);
      await execAsync(strategies[i], { timeout: 12e4 });
      const fs4 = await import("fs/promises");
      await fs4.access(tempFile);
      console.log(`[YouTube] Strategy ${i + 1} succeeded`);
      break;
    } catch (error) {
      console.log(`[YouTube] Strategy ${i + 1} failed:`, error instanceof Error ? error.message : String(error));
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }
  try {
    const fs4 = await import("fs/promises");
    await fs4.access(tempFile);
  } catch {
    throw new Error(`Failed to download YouTube audio after trying all strategies: ${lastError?.message || "Unknown error"}`);
  }
  try {
    const fs4 = await import("fs/promises");
    const audioBuffer = await fs4.readFile(tempFile);
    const s3Key = `voice-covers/input-${tempId}.mp3`;
    const result = await storagePut(s3Key, audioBuffer, "audio/mpeg");
    await unlink2(tempFile);
    return { url: result.url, title: videoTitle };
  } catch (error) {
    try {
      await unlink2(tempFile);
    } catch {
    }
    throw new Error(`Failed to upload YouTube audio to S3: ${error instanceof Error ? error.message : String(error)}`);
  }
}
function isYouTubeUrl(url) {
  return /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/.test(url);
}

// server/routers.ts
function getReplicateModelName(voiceId) {
  const mapping = {
    "squidward": "Squidward",
    "mrkrabs": "MrKrabs",
    "plankton": "Plankton",
    "drake": "Drake",
    "vader": "Vader",
    "trump": "Trump",
    "donald-trump": "Trump",
    "biden": "Biden",
    "joe-biden": "Biden",
    "obama": "Obama",
    "barack-obama": "Obama",
    "guitar": "Guitar",
    "violin": "Voilin",
    // Note: Replicate has a typo
    "voilin": "Voilin"
    // Alternative spelling
  };
  return mapping[voiceId.toLowerCase()] || voiceId;
}
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
  upload: uploadRouter,
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
      z3.object({
        prompt: z3.string().optional(),
        description: z3.string().optional(),
        title: z3.string(),
        style: z3.string(),
        model: z3.enum(["V5", "V4_5PLUS", "V4_5", "V4", "V3_5"]),
        customMode: z3.boolean(),
        instrumental: z3.boolean(),
        gender: z3.enum(["m", "f", "random"]).optional()
      })
    ).mutation(async ({ ctx, input }) => {
      const { createMusicTrack: createMusicTrack2, updateMusicTrack: updateMusicTrack2 } = await Promise.resolve().then(() => (init_db(), db_exports));
      const { generateMusic: generateMusic2, pollTaskCompletion: pollTaskCompletion2 } = await Promise.resolve().then(() => (init_minimaxApi(), minimaxApi_exports));
      const { generateSongArtwork: generateSongArtwork2 } = await Promise.resolve().then(() => (init_imageGenerator(), imageGenerator_exports));
      const trackId = `track_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      let finalPrompt = input.prompt || "";
      if (input.description && !input.prompt) {
        console.log(`[Music Generation] Generating title, style, and lyrics from description for ${trackId}`);
        try {
          const { invokeLLM: invokeLLM2 } = await Promise.resolve().then(() => (init_llm(), llm_exports));
          const metadataPrompt = `Based on this song description, generate a suitable title and music style:

Description: "${input.description}"

Provide your response in this exact JSON format:
{
  "title": "A catchy, memorable song title (3-5 words)",
  "style": "Primary music genre/style (e.g., Pop, Rock, Jazz, Electronic, etc.)"
}`;
          const metadataResponse = await invokeLLM2({
            messages: [
              {
                role: "system",
                content: "You are a music expert who analyzes song descriptions and suggests appropriate titles and styles. Always respond with valid JSON."
              },
              {
                role: "user",
                content: metadataPrompt
              }
            ]
          });
          let extractedTitle = input.title;
          let extractedStyle = input.style || "Pop";
          try {
            const metadataContent = metadataResponse.choices[0]?.message?.content || "";
            const jsonMatch = metadataContent.match(/\{[^}]+\}/);
            if (jsonMatch) {
              const metadata = JSON.parse(jsonMatch[0]);
              extractedTitle = metadata.title || input.title;
              extractedStyle = metadata.style || input.style || "Pop";
            }
          } catch (parseError) {
            console.warn(`[Music Generation] Failed to parse metadata JSON, using defaults`);
          }
          console.log(`[Music Generation] Extracted title: "${extractedTitle}", style: "${extractedStyle}"`);
          input.title = extractedTitle;
          input.style = extractedStyle;
          const lyricsPrompt = `Generate creative and engaging song lyrics based on this description: "${input.description}"

Title: ${extractedTitle}
Style: ${extractedStyle}

Generate complete song lyrics with proper structure including [Intro], [Verse], [Chorus], [Bridge], etc. tags.
Make the lyrics emotional, memorable, and suitable for the ${extractedStyle} style.
Ensure the lyrics can be performed within ${MAX_LYRIC_DURATION_MINUTES} minutes (about ${MAX_LYRIC_WORDS} words).`;
          const lyricsResponse = await invokeLLM2({
            messages: [
              {
                role: "system",
                content: "You are a professional songwriter who creates engaging, emotional, and memorable lyrics based on user descriptions."
              },
              {
                role: "user",
                content: lyricsPrompt
              }
            ]
          });
          const generatedLyrics = lyricsResponse.choices[0]?.message?.content || "";
          finalPrompt = trimLyricsToWordLimit(generatedLyrics);
          console.log(`[Music Generation] Generated lyrics for ${trackId}:`, finalPrompt.substring(0, 200) + "...");
        } catch (error) {
          console.error(`[Music Generation] Failed to generate from description:`, error);
          throw new Error("Failed to generate song from description. Please try again or use the Lyrics tab.");
        }
      }
      let imageUrl;
      try {
        imageUrl = await generateSongArtwork2({
          title: input.title || "Untitled",
          style: input.style,
          seed: trackId
        });
        console.log(`[Music Generation] Generated artwork for ${trackId}: ${imageUrl}`);
      } catch (error) {
        console.error(`[Music Generation] Failed to generate artwork for ${trackId}:`, error);
      }
      await createMusicTrack2({
        id: trackId,
        userId: ctx.user.id,
        title: input.title,
        prompt: finalPrompt,
        style: input.style,
        model: input.model,
        instrumental: input.instrumental ? "yes" : "no",
        imageUrl,
        status: "pending"
      });
      (async () => {
        try {
          console.log(`[Music Generation] Starting generation for track ${trackId}`);
          console.log(`[Music Generation] Input:`, JSON.stringify(input, null, 2));
          const result = await generateMusic2({
            prompt: finalPrompt,
            title: input.title,
            style: input.style,
            instrumental: input.instrumental,
            gender: input.gender
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
    getById: publicProcedure.input(z3.object({ id: z3.string() })).query(async ({ input }) => {
      const { getMusicTrackById: getMusicTrackById2 } = await Promise.resolve().then(() => (init_db(), db_exports));
      const track = await getMusicTrackById2(input.id);
      return track;
    }),
    generateLyrics: protectedProcedure.input(
      z3.object({
        style: z3.string(),
        title: z3.string().optional(),
        mood: z3.string().optional()
      })
    ).mutation(async ({ input }) => {
      const canGenerateLyrics = ENV.forgeFeaturesEnabled && !!ENV.forgeApiKey || !!ENV.openaiApiKey || !!process.env.REPLICATE_API_TOKEN;
      if (!canGenerateLyrics) {
        throw new Error("Lyrics generation is not configured.");
      }
      const { invokeLLM: invokeLLM2 } = await Promise.resolve().then(() => (init_llm(), llm_exports));
      const prompt = `Generate creative and engaging song lyrics in the ${input.style} style.${input.title ? ` The song title is "${input.title}".` : ""}${input.mood ? ` The mood/theme should be: ${input.mood}` : ""}

Generate complete song lyrics with proper structure including [Intro], [Verse], [Chorus], [Bridge], etc. tags.
Make the lyrics emotional, memorable, and suitable for the ${input.style} genre.
${input.title ? "" : "Also suggest a catchy title for the song."}
Ensure the lyrics can be performed within ${MAX_LYRIC_DURATION_MINUTES} minutes (about ${MAX_LYRIC_WORDS} words). Keep sections concise and avoid overly long verses.`;
      const songwriterSystemPrompt = "You are a professional songwriter who creates engaging, emotional, and memorable lyrics.";
      try {
        console.log("[Lyrics Generation] System prompt:", songwriterSystemPrompt);
        console.log("[Lyrics Generation] User prompt:", prompt);
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
        console.log("[Lyrics Generation] Raw response:", response.choices[0]?.message?.content);
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
        console.log("[Lyrics Generation] Before sanitization:", lyrics.substring(0, 200));
        lyrics = lyrics.replace(/You are a professional songwriter\.?\s*Generate creative and engaging song lyrics in\s*/gi, "");
        lyrics = lyrics.replace(/You are a professional songwriter\.?\s*/gi, "");
        lyrics = lyrics.replace(/Generate creative and engaging song lyrics in\s*/gi, "");
        lyrics = lyrics.replace(/\n\s*\n\s*\n/g, "\n\n");
        lyrics = lyrics.trim();
        console.log("[Lyrics Generation] After sanitization:", lyrics.substring(0, 200));
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
    getVoices: publicProcedure.input(z3.object({ category: z3.string().optional() }).optional()).query(({ input }) => {
      return getVoicesByCategory(input?.category);
    }),
    // Get trending voices
    getTrending: publicProcedure.query(() => {
      return getTrendingVoices(5);
    }),
    // Search voices
    search: publicProcedure.input(z3.object({ query: z3.string() })).query(({ input }) => {
      return searchVoices(input.query);
    }),
    // Get voice model by ID
    getVoiceById: publicProcedure.input(z3.object({ id: z3.string() })).query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const result = await db.select().from(voiceModels).where(eq3(voiceModels.id, input.id));
      return result[0] || null;
    }),
    // Create voice cover
    create: publicProcedure.input(
      z3.object({
        voiceModelId: z3.string(),
        audioUrl: z3.string(),
        pitchChange: z3.enum(["no-change", "male-to-female", "female-to-male"]).optional()
      })
    ).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const voiceModelResult = await db.select().from(voiceModels).where(eq3(voiceModels.id, input.voiceModelId));
      const voiceModel = voiceModelResult[0];
      if (!voiceModel) {
        throw new Error("Voice model not found");
      }
      const coverId = nanoid3();
      let processedAudioUrl = input.audioUrl;
      let songTitle;
      if (isYouTubeUrl(input.audioUrl)) {
        console.log(`[Voice Cover] Downloading YouTube audio: ${input.audioUrl}`);
        const downloadResult = await downloadYouTubeAudio(input.audioUrl);
        processedAudioUrl = downloadResult.url;
        songTitle = downloadResult.title;
        console.log(`[Voice Cover] YouTube audio downloaded to: ${processedAudioUrl}`);
        console.log(`[Voice Cover] Song title: ${songTitle}`);
      }
      const userId = ctx.user?.id || "dev-user";
      const coverData = {
        id: coverId,
        userId,
        voiceModelId: input.voiceModelId,
        voiceModelName: voiceModel.name,
        avatarUrl: voiceModel.avatarUrl,
        originalAudioUrl: processedAudioUrl,
        status: "processing",
        pitchChange: input.pitchChange || "no-change"
      };
      if (songTitle) {
        coverData.songTitle = songTitle;
      }
      await createVoiceCover(coverData);
      console.log(`[Voice Cover] Scheduling background conversion for ${coverId}`);
      const backgroundTask = (async () => {
        try {
          console.log(`[Voice Cover] Starting background conversion for ${coverId}`);
          console.log(`[Voice Cover] Audio URL: ${processedAudioUrl}`);
          console.log(`[Voice Cover] Voice Model: ${getReplicateModelName(voiceModel.id)}`);
          console.log(`[Voice Cover] Pitch Change: ${input.pitchChange}`);
          const result = await convertVoice({
            songInput: processedAudioUrl,
            rvcModel: getReplicateModelName(voiceModel.id),
            pitchChange: input.pitchChange
          });
          console.log(`[Voice Cover] Conversion completed for ${coverId}`);
          console.log(`[Voice Cover] Result:`, JSON.stringify(result));
          let duration = 0;
          if (result.audioUrl) {
            try {
              duration = await getAudioDuration(result.audioUrl);
              console.log(`[Voice Cover] Audio duration: ${duration} seconds`);
            } catch (err) {
              console.error(`[Voice Cover] Failed to get audio duration:`, err);
            }
          }
          const updateData = {
            convertedAudioUrl: result.audioUrl,
            status: result.status,
            duration
          };
          await updateVoiceCover(coverId, updateData);
          console.log(`[Voice Cover] Successfully updated cover ${coverId}`);
        } catch (error) {
          console.error(`[Voice Cover] Error in background conversion for ${coverId}:`, error);
          try {
            await updateVoiceCover(coverId, {
              status: "failed"
            });
          } catch (updateError) {
            console.error(`[Voice Cover] Failed to update error status for ${coverId}:`, updateError);
          }
        }
      })();
      backgroundTask.catch((err) => {
        console.error(`[Voice Cover] Unhandled error in background process for ${coverId}:`, err);
        console.error(`[Voice Cover] Error stack:`, err.stack);
      });
      return {
        success: true,
        id: coverId
      };
    }),
    // Get voice cover by ID (for polling status)
    getById: publicProcedure.input(z3.object({ id: z3.string() })).query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const { voiceCovers: voiceCovers2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const result = await db.select().from(voiceCovers2).where(eq3(voiceCovers2.id, input.id)).limit(1);
      return result[0] || null;
    }),
    // Get user's voice covers
    getUserCovers: publicProcedure.query(async ({ ctx }) => {
      const userId = ctx.user?.id || "dev-user";
      return await getUserVoiceCovers(userId);
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
import { nanoid as nanoid4 } from "nanoid";
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
          `src="/src/main.tsx?v=${nanoid4()}"`
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
  app.get("/api/download", async (req, res) => {
    try {
      const { url, filename } = req.query;
      if (!url || typeof url !== "string") {
        return res.status(400).send("Missing url parameter");
      }
      const response = await fetch(url);
      if (!response.ok) {
        return res.status(response.status).send("Failed to fetch audio");
      }
      const buffer = await response.arrayBuffer();
      const fileName = filename && typeof filename === "string" ? filename : "audio.mp3";
      res.setHeader("Content-Type", "audio/mpeg");
      res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
      res.send(Buffer.from(buffer));
    } catch (error) {
      console.error("Download proxy error:", error);
      res.status(500).send("Download failed");
    }
  });
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
