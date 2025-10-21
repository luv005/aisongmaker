CREATE TABLE `voice_covers` (
	`id` varchar(64) NOT NULL,
	`userId` varchar(64) NOT NULL,
	`voiceModelId` varchar(64) NOT NULL,
	`voiceModelName` varchar(128) NOT NULL,
	`originalAudioUrl` text,
	`convertedAudioUrl` text,
	`status` enum('processing','completed','failed') NOT NULL DEFAULT 'processing',
	`pitchChange` varchar(32),
	`duration` int DEFAULT 0,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `voice_covers_id` PRIMARY KEY(`id`)
);
