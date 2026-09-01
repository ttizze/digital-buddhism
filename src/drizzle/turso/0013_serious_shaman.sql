CREATE TABLE `segment_words` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`segment_id` integer NOT NULL,
	`position` integer NOT NULL,
	`start_offset` integer NOT NULL,
	`end_offset` integer NOT NULL,
	`surface` text NOT NULL,
	FOREIGN KEY (`segment_id`) REFERENCES `segments`(`id`) ON UPDATE cascade ON DELETE cascade,
	CONSTRAINT "segment_words_position_check" CHECK("segment_words"."position" >= 0),
	CONSTRAINT "segment_words_offset_check" CHECK("segment_words"."start_offset" >= 0 AND "segment_words"."end_offset" > "segment_words"."start_offset")
);
--> statement-breakpoint
CREATE UNIQUE INDEX `segment_words_segment_id_position_key` ON `segment_words` (`segment_id`,`position`);--> statement-breakpoint
CREATE UNIQUE INDEX `segment_words_segment_id_offsets_key` ON `segment_words` (`segment_id`,`start_offset`,`end_offset`);--> statement-breakpoint
CREATE INDEX `segment_words_segment_id_idx` ON `segment_words` (`segment_id`);--> statement-breakpoint
CREATE TABLE `selected_word_glosses` (
	`word_id` integer NOT NULL,
	`locale` text NOT NULL,
	`gloss_id` integer NOT NULL,
	`selected_by_user_id` text,
	`selected_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	PRIMARY KEY(`word_id`, `locale`),
	FOREIGN KEY (`gloss_id`,`word_id`,`locale`) REFERENCES `word_glosses`(`id`,`word_id`,`locale`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`selected_by_user_id`) REFERENCES `users`(`id`) ON UPDATE cascade ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `selected_word_glosses_gloss_id_key` ON `selected_word_glosses` (`gloss_id`);--> statement-breakpoint
CREATE TABLE `word_gloss_votes` (
	`gloss_id` integer NOT NULL,
	`user_id` text NOT NULL,
	`is_upvote` integer NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`gloss_id`) REFERENCES `word_glosses`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `word_gloss_votes_gloss_id_idx` ON `word_gloss_votes` (`gloss_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `word_gloss_votes_gloss_id_user_id_key` ON `word_gloss_votes` (`gloss_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `word_gloss_votes_user_id_idx` ON `word_gloss_votes` (`user_id`);--> statement-breakpoint
CREATE TABLE `word_glosses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`word_id` integer NOT NULL,
	`locale` text NOT NULL,
	`text` text NOT NULL,
	`point` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`user_id` text NOT NULL,
	`ai_model` text,
	FOREIGN KEY (`word_id`) REFERENCES `segment_words`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `word_glosses_word_id_locale_idx` ON `word_glosses` (`word_id`,`locale`);--> statement-breakpoint
CREATE UNIQUE INDEX `word_glosses_id_word_id_locale_key` ON `word_glosses` (`id`,`word_id`,`locale`);--> statement-breakpoint
CREATE INDEX `word_glosses_user_id_idx` ON `word_glosses` (`user_id`);--> statement-breakpoint
DROP TABLE `segment_gloss_unit_votes`;--> statement-breakpoint
DROP TABLE `selected_segment_gloss_sets`;--> statement-breakpoint
DROP TABLE `segment_gloss_units`;--> statement-breakpoint
DROP TABLE `segment_gloss_sets`;
