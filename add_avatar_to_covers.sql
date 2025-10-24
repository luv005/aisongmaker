-- Add avatarUrl column to voice_covers table
ALTER TABLE voice_covers ADD COLUMN avatarUrl TEXT AFTER songTitle;
