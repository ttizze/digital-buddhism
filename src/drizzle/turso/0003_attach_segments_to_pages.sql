PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_segments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`content_id` integer NOT NULL,
	`number` integer NOT NULL,
	`text` text NOT NULL,
	`text_and_occurrence_hash` text NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`segment_type_id` integer NOT NULL,
	FOREIGN KEY (`content_id`) REFERENCES `pages`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`segment_type_id`) REFERENCES `segment_types`(`id`) ON UPDATE cascade ON DELETE restrict
);
--> statement-breakpoint
INSERT INTO `__new_segments`("id", "content_id", "number", "text", "text_and_occurrence_hash", "created_at", "segment_type_id") SELECT "id", "content_id", "number", "text", "text_and_occurrence_hash", "created_at", "segment_type_id" FROM `segments`;--> statement-breakpoint
DROP TABLE `segments`;--> statement-breakpoint
ALTER TABLE `__new_segments` RENAME TO `segments`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `segments_content_id_idx` ON `segments` (`content_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `segments_content_id_number_key` ON `segments` (`content_id`,`number`);--> statement-breakpoint
CREATE UNIQUE INDEX `segments_content_id_text_and_occurrence_hash_key` ON `segments` (`content_id`,`text_and_occurrence_hash`);--> statement-breakpoint
CREATE INDEX `segments_text_and_occurrence_hash_idx` ON `segments` (`text_and_occurrence_hash`);