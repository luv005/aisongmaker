import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  id: varchar("id", { length: 64 }).primaryKey(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Music generation history table
export const musicTracks = mysqlTable("music_tracks", {
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
  createdAt: timestamp("createdAt").defaultNow(),
});

export type MusicTrack = typeof musicTracks.$inferSelect;
export type InsertMusicTrack = typeof musicTracks.$inferInsert;


// Voice cover tracks table
export const voiceCovers = mysqlTable("voice_covers", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("userId", { length: 64 }).notNull(),
  voiceModelId: varchar("voiceModelId", { length: 64 }).notNull(),
  voiceModelName: varchar("voiceModelName", { length: 128 }).notNull(),
  songTitle: varchar("songTitle", { length: 256 }),
  originalAudioUrl: text("originalAudioUrl"),
  convertedAudioUrl: text("convertedAudioUrl"),
  status: mysqlEnum("status", ["processing", "completed", "failed"]).default("processing").notNull(),
  pitchChange: varchar("pitchChange", { length: 32 }),
  duration: int("duration").default(0),
  createdAt: timestamp("createdAt").defaultNow(),
});

export type VoiceCover = typeof voiceCovers.$inferSelect;
export type InsertVoiceCover = typeof voiceCovers.$inferInsert;

// Voice models library table
export const voiceModels = mysqlTable("voice_models", {
  id: varchar("id", { length: 64 }).primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  category: varchar("category", { length: 64 }).notNull(),
  avatarUrl: text("avatarUrl"),
  demoAudioUrl: text("demoAudioUrl"),
  uses: int("uses").default(0),
  likes: int("likes").default(0),
  isTrending: int("isTrending").default(0),
  createdAt: timestamp("createdAt").defaultNow(),
});

export type VoiceModel = typeof voiceModels.$inferSelect;
export type InsertVoiceModel = typeof voiceModels.$inferInsert;

