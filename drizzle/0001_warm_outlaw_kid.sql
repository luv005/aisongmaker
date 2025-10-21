CREATE TABLE `music_tracks` (
	`id` varchar(64) NOT NULL,
	`userId` varchar(64) NOT NULL,
	`taskId` varchar(64),
	`title` varchar(255),
	`prompt` text,
	`style` varchar(255),
	`model` varchar(32),
	`instrumental` enum('yes','no') DEFAULT 'no',
	`audioUrl` text,
	`streamUrl` text,
	`status` enum('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `music_tracks_id` PRIMARY KEY(`id`)
);
