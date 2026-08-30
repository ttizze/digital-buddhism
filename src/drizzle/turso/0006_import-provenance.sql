PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_import_files` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`import_run_id` integer NOT NULL,
	`path` text NOT NULL,
	`checksum` text,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`message` text DEFAULT '' NOT NULL,
	`started_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`finished_at` integer,
	FOREIGN KEY (`import_run_id`) REFERENCES `import_runs`(`id`) ON UPDATE cascade ON DELETE cascade,
	CONSTRAINT "import_files_status_check" CHECK("__new_import_files"."status" IN ('PENDING', 'COMPLETED', 'FAILED'))
);
--> statement-breakpoint
INSERT INTO `__new_import_files`("id", "import_run_id", "path", "checksum", "status", "message", "started_at", "finished_at") SELECT "id", "import_run_id", "path", "checksum", CASE WHEN "status" IN ('PENDING', 'COMPLETED', 'FAILED') THEN "status" ELSE 'FAILED' END, "message", "created_at", CASE WHEN "status" = 'PENDING' THEN NULL ELSE "created_at" END FROM `import_files`;--> statement-breakpoint
DROP TABLE `import_files`;--> statement-breakpoint
ALTER TABLE `__new_import_files` RENAME TO `import_files`;--> statement-breakpoint
CREATE UNIQUE INDEX `import_files_import_run_id_path_key` ON `import_files` (`import_run_id`,`path`);--> statement-breakpoint
CREATE INDEX `import_files_path_idx` ON `import_files` (`path`);--> statement-breakpoint
CREATE TABLE `__new_import_runs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`started_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`finished_at` integer,
	`status` text DEFAULT 'RUNNING' NOT NULL,
	`message` text DEFAULT '' NOT NULL,
	CONSTRAINT "import_runs_status_check" CHECK("__new_import_runs"."status" IN ('RUNNING', 'COMPLETED', 'FAILED'))
);
--> statement-breakpoint
INSERT INTO `__new_import_runs`("id", "started_at", "finished_at", "status", "message") SELECT "id", "started_at", "finished_at", CASE WHEN "status" IN ('RUNNING', 'COMPLETED', 'FAILED') THEN "status" ELSE 'FAILED' END, '' FROM `import_runs`;--> statement-breakpoint
DROP TABLE `import_runs`;--> statement-breakpoint
ALTER TABLE `__new_import_runs` RENAME TO `import_runs`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
ALTER TABLE `tipitaka_pages` ADD `import_file_id` integer REFERENCES import_files(id) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX `tipitaka_pages_import_file_id_idx` ON `tipitaka_pages` (`import_file_id`);