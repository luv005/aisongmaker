CREATE TABLE `voice_models` (
	`id` varchar(64) NOT NULL,
	`name` varchar(128) NOT NULL,
	`category` varchar(64) NOT NULL,
	`avatarUrl` text,
	`demoAudioUrl` text,
	`uses` int DEFAULT 0,
	`likes` int DEFAULT 0,
	`isTrending` int DEFAULT 0,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `voice_models_id` PRIMARY KEY(`id`)
);
