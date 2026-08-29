PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_pages` (
	`id` integer PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`source_locale` text DEFAULT 'unknown' NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`status` text DEFAULT 'DRAFT' NOT NULL,
	`user_id` text NOT NULL,
	`mdast_json` text NOT NULL,
	`order` integer DEFAULT 0 NOT NULL,
	`parent_id` integer,
	`published_at` integer,
	`archived_at` integer,
	FOREIGN KEY (`parent_id`) REFERENCES `pages`(`id`) ON UPDATE cascade ON DELETE set null,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE cascade ON DELETE cascade,
	CONSTRAINT "pages_status_check" CHECK("__new_pages"."status" IN ('DRAFT', 'PUBLIC', 'ARCHIVE'))
);
--> statement-breakpoint
INSERT INTO `__new_pages`("id", "slug", "created_at", "source_locale", "updated_at", "status", "user_id", "mdast_json", "order", "parent_id", "published_at", "archived_at") SELECT "id", "slug", "created_at", "source_locale", "updated_at", "status", "user_id", "mdast_json", "order", "parent_id", "published_at", "archived_at" FROM `pages`;--> statement-breakpoint
DROP TABLE `pages`;--> statement-breakpoint
ALTER TABLE `__new_pages` RENAME TO `pages`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `pages_created_at_idx` ON `pages` (`created_at`);--> statement-breakpoint
CREATE INDEX `pages_parent_id_idx` ON `pages` (`parent_id`);--> statement-breakpoint
CREATE INDEX `pages_parent_id_order_idx` ON `pages` (`parent_id`,`order`);--> statement-breakpoint
CREATE INDEX `pages_slug_idx` ON `pages` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `pages_slug_key` ON `pages` (`slug`);--> statement-breakpoint
CREATE INDEX `pages_status_created_at_idx` ON `pages` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `pages_status_parent_id_created_at_idx` ON `pages` (`status`,`parent_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `pages_user_id_idx` ON `pages` (`user_id`);