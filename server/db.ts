import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { createPool, type PoolOptions } from "mysql2";
import { InsertUser, users } from "../drizzle/schema.js";
import { ENV } from "./_core/env.js";

let _db: ReturnType<typeof drizzle> | null = null;
let _connectionAttempted = false;
let _connectionPromise: Promise<ReturnType<typeof drizzle> | null> | null = null;

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1"]);

function createPoolConfig(url: string): PoolOptions {
  const parsed = new URL(url);
  const database = parsed.pathname.replace(/^\//, "");

  if (!database) {
    throw new Error("DATABASE_URL must include a database name");
  }

  const port = parsed.port ? Number.parseInt(parsed.port, 10) : 3306;

  const config: PoolOptions = {
    host: parsed.hostname,
    port,
    database,
    waitForConnections: true,
    connectionLimit: 10,
    connectTimeout: 5000,
    queueLimit: 0,
  };

  if (parsed.username) {
    config.user = decodeURIComponent(parsed.username);
  }

  if (parsed.password) {
    config.password = decodeURIComponent(parsed.password);
  }

  const hasSslMode = parsed.searchParams.get("ssl-mode");
  const sslMode = hasSslMode ? hasSslMode.toLowerCase() : undefined;
  const disableSsl =
    sslMode === "disable" ||
    sslMode === "disabled" ||
    parsed.searchParams.get("ssl") === "0" ||
    parsed.searchParams.get("ssl") === "false";

  const isLocalhost = LOCAL_HOSTS.has(parsed.hostname);

  if (!disableSsl && !isLocalhost) {
    config.ssl = {
      rejectUnauthorized: true,
    };
  }

  return config;
}

// Initialize database connection in background (non-blocking)
function initializeDb(): Promise<ReturnType<typeof drizzle> | null> {
  if (_connectionPromise) return _connectionPromise;
  
  if (_connectionAttempted) {
    return Promise.resolve(null);
  }
  
  if (!ENV.databaseUrl) {
    console.warn("[Database] DATABASE_URL not configured");
    _connectionAttempted = true;
    return Promise.resolve(null);
  }
  
  _connectionPromise = (async () => {
    try {
      _connectionAttempted = true;
      console.log("[Database] Attempting to connect...");
      
      // Create connection pool with timeout
      const pool = createPool(createPoolConfig(ENV.databaseUrl));
      
      // Test the connection with a simple query (with timeout)
      await Promise.race([
        new Promise((resolve, reject) => {
          pool.query('SELECT 1', (err) => {
            if (err) reject(err);
            else resolve(true);
          });
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout')), 5000)
        )
      ]);
      
      _db = drizzle(pool);
      console.log("[Database] Connected successfully");
      return _db;
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
      return null;
    }
  })();
  
  return _connectionPromise;
}

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (_db) return _db;
  return initializeDb();
}

// Start connection attempt in background on module load
if (ENV.databaseUrl) {
  initializeDb().catch(() => {});
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.id) {
    throw new Error("User ID is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      id: user.id,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role === undefined) {
      if (user.id === ENV.ownerId) {
        user.role = 'admin';
        values.role = 'admin';
        updateSet.role = 'admin';
      }
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUser(id: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Music track queries
import { InsertMusicTrack, musicTracks } from "../drizzle/schema.js";
import { desc } from "drizzle-orm";

export async function createMusicTrack(track: InsertMusicTrack) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot create music track: database not available");
    return undefined;
  }
  
  const result = await db.insert(musicTracks).values(track);
  return track;
}

export async function getUserMusicTracks(userId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get music tracks: database not available");
    return [];
  }
  
  return db.select().from(musicTracks).where(eq(musicTracks.userId, userId)).orderBy(desc(musicTracks.createdAt));
}

export async function getMusicTrackById(id: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get music track: database not available");
    return undefined;
  }
  
  const result = await db.select().from(musicTracks).where(eq(musicTracks.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateMusicTrack(id: string, updates: Partial<InsertMusicTrack>) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update music track: database not available");
    return undefined;
  }
  
  await db.update(musicTracks).set(updates).where(eq(musicTracks.id, id));
}


// Voice cover queries
import { InsertVoiceCover, voiceCovers } from "../drizzle/schema.js";

export async function createVoiceCover(cover: InsertVoiceCover) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot create voice cover: database not available");
    return undefined;
  }

  try {
    await db.insert(voiceCovers).values(cover);
    return cover;
  } catch (error) {
    console.error("[Database] Failed to create voice cover:", error);
    throw error;
  }
}

export async function updateVoiceCover(id: string, updates: Partial<InsertVoiceCover>) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update voice cover: database not available");
    return undefined;
  }

  try {
    await db.update(voiceCovers).set(updates).where(eq(voiceCovers.id, id));
  } catch (error) {
    console.error("[Database] Failed to update voice cover:", error);
    throw error;
  }
}

export async function getUserVoiceCovers(userId: string) {
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
