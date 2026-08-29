DROP TABLE `contents`;--> statement-breakpoint
DROP TABLE `follows`;--> statement-breakpoint
DROP TABLE `like_pages`;--> statement-breakpoint
DROP TABLE `page_comments`;--> statement-breakpoint
DROP TABLE `page_views`;--> statement-breakpoint
DROP TABLE `tag_pages`;--> statement-breakpoint
DROP TABLE `tags`;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_notifications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`read` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`actor_id` text NOT NULL,
	`segment_translation_id` integer NOT NULL,
	FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`segment_translation_id`) REFERENCES `segment_translations`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_notifications`("id", "user_id", "read", "created_at", "actor_id", "segment_translation_id") SELECT "id", "user_id", "read", "created_at", "actor_id", "segment_translation_id" FROM `notifications`;--> statement-breakpoint
DROP TABLE `notifications`;--> statement-breakpoint
ALTER TABLE `__new_notifications` RENAME TO `notifications`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `notifications_actor_id_idx` ON `notifications` (`actor_id`);--> statement-breakpoint
CREATE INDEX `notifications_user_id_idx` ON `notifications` (`user_id`);