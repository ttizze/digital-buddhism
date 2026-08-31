CREATE TABLE `segment_gloss_sets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`segment_id` integer NOT NULL,
	`locale` text NOT NULL,
	`ai_model` text,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`user_id` text NOT NULL,
	FOREIGN KEY (`segment_id`) REFERENCES `segments`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `segment_gloss_sets_segment_id_locale_idx` ON `segment_gloss_sets` (`segment_id`,`locale`);--> statement-breakpoint
CREATE UNIQUE INDEX `segment_gloss_sets_id_segment_id_locale_key` ON `segment_gloss_sets` (`id`,`segment_id`,`locale`);--> statement-breakpoint
CREATE INDEX `segment_gloss_sets_user_id_idx` ON `segment_gloss_sets` (`user_id`);--> statement-breakpoint
CREATE TABLE `segment_gloss_unit_votes` (
	`gloss_unit_id` integer NOT NULL,
	`user_id` text NOT NULL,
	`is_upvote` integer NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`gloss_unit_id`) REFERENCES `segment_gloss_units`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `segment_gloss_unit_votes_gloss_unit_id_idx` ON `segment_gloss_unit_votes` (`gloss_unit_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `segment_gloss_unit_votes_gloss_unit_id_user_id_key` ON `segment_gloss_unit_votes` (`gloss_unit_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `segment_gloss_unit_votes_user_id_idx` ON `segment_gloss_unit_votes` (`user_id`);--> statement-breakpoint
CREATE TABLE `segment_gloss_units` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`gloss_set_id` integer NOT NULL,
	`position` integer NOT NULL,
	`start_offset` integer NOT NULL,
	`end_offset` integer NOT NULL,
	`surface` text NOT NULL,
	`gloss` text NOT NULL,
	`point` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`gloss_set_id`) REFERENCES `segment_gloss_sets`(`id`) ON UPDATE cascade ON DELETE cascade,
	CONSTRAINT "segment_gloss_units_position_check" CHECK("segment_gloss_units"."position" >= 0),
	CONSTRAINT "segment_gloss_units_offset_check" CHECK("segment_gloss_units"."start_offset" >= 0 AND "segment_gloss_units"."end_offset" > "segment_gloss_units"."start_offset")
);
--> statement-breakpoint
CREATE UNIQUE INDEX `segment_gloss_units_gloss_set_id_position_key` ON `segment_gloss_units` (`gloss_set_id`,`position`);--> statement-breakpoint
CREATE TABLE `selected_segment_gloss_sets` (
	`segment_id` integer NOT NULL,
	`locale` text NOT NULL,
	`gloss_set_id` integer NOT NULL,
	`selected_by_user_id` text,
	`selected_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	PRIMARY KEY(`segment_id`, `locale`),
	FOREIGN KEY (`gloss_set_id`,`segment_id`,`locale`) REFERENCES `segment_gloss_sets`(`id`,`segment_id`,`locale`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`selected_by_user_id`) REFERENCES `users`(`id`) ON UPDATE cascade ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `selected_segment_gloss_sets_gloss_set_id_key` ON `selected_segment_gloss_sets` (`gloss_set_id`);