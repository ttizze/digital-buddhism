CREATE TABLE `tipitaka_pages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`parent_id` integer,
	`slug` text NOT NULL,
	`kind` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`mdast_json` text NOT NULL,
	`is_visible` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`parent_id`) REFERENCES `tipitaka_pages`(`id`) ON UPDATE cascade ON DELETE restrict,
	CONSTRAINT "tipitaka_pages_kind_check" CHECK(`kind` IN ('ROOT', 'CATEGORY', 'TEXT', 'COMMENTARY')),
	CONSTRAINT "tipitaka_pages_root_parent_check" CHECK((`kind` = 'ROOT' AND `parent_id` IS NULL) OR (`kind` <> 'ROOT' AND `parent_id` IS NOT NULL)),
	CONSTRAINT "tipitaka_pages_position_check" CHECK(`position` >= 0),
	CONSTRAINT "tipitaka_pages_is_visible_check" CHECK(`is_visible` IN (0, 1))
);
--> statement-breakpoint
WITH RECURSIVE `tipitaka_tree` AS (
	SELECT `pages`.`id`
	FROM `pages`
	INNER JOIN `users` ON `users`.`id` = `pages`.`user_id`
	WHERE `pages`.`slug` = 'tipitaka'
		AND `pages`.`parent_id` IS NULL
		AND `users`.`handle` = 'evame'
	UNION ALL
	SELECT `child`.`id`
	FROM `pages` AS `child`
	INNER JOIN `tipitaka_tree` ON `child`.`parent_id` = `tipitaka_tree`.`id`
)
INSERT INTO `tipitaka_pages` (
	`id`,
	`parent_id`,
	`slug`,
	`kind`,
	`position`,
	`mdast_json`,
	`is_visible`,
	`created_at`,
	`updated_at`
)
SELECT
	`page`.`id`,
	`page`.`parent_id`,
	`page`.`slug`,
	CASE
		WHEN `page`.`parent_id` IS NULL THEN 'ROOT'
		WHEN EXISTS (
			SELECT 1
			FROM `segments`
			INNER JOIN `segment_types` ON `segment_types`.`id` = `segments`.`segment_type_id`
			WHERE `segments`.`content_id` = `page`.`id`
				AND `segment_types`.`key` = 'COMMENTARY'
		) THEN 'COMMENTARY'
		WHEN EXISTS (
			SELECT 1
			FROM `pages` AS `child`
			WHERE `child`.`parent_id` = `page`.`id`
		) THEN 'CATEGORY'
		ELSE 'TEXT'
	END,
	`page`.`order`,
	`page`.`mdast_json`,
	CASE
		WHEN `page`.`status` = 'PUBLIC'
			OR (`page`.`status` = 'ARCHIVE' AND `page`.`published_at` IS NOT NULL)
		THEN 1
		ELSE 0
	END,
	`page`.`created_at`,
	`page`.`updated_at`
FROM `pages` AS `page`
INNER JOIN `tipitaka_tree` ON `tipitaka_tree`.`id` = `page`.`id`;
--> statement-breakpoint
CREATE INDEX `tipitaka_pages_parent_id_idx` ON `tipitaka_pages` (`parent_id`);
--> statement-breakpoint
CREATE INDEX `tipitaka_pages_parent_visible_position_idx` ON `tipitaka_pages` (`parent_id`,`is_visible`,`position`);
--> statement-breakpoint
CREATE UNIQUE INDEX `tipitaka_pages_slug_key` ON `tipitaka_pages` (`slug`);
--> statement-breakpoint
CREATE UNIQUE INDEX `tipitaka_pages_single_root_key` ON `tipitaka_pages` (`kind`) WHERE `kind` = 'ROOT';
--> statement-breakpoint
CREATE TABLE `__new_segments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tipitaka_page_id` integer NOT NULL,
	`number` integer NOT NULL,
	`text` text NOT NULL,
	`text_and_occurrence_hash` text NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`segment_type_id` integer NOT NULL,
	FOREIGN KEY (`tipitaka_page_id`) REFERENCES `tipitaka_pages`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`segment_type_id`) REFERENCES `segment_types`(`id`) ON UPDATE cascade ON DELETE restrict
);
--> statement-breakpoint
INSERT INTO `__new_segments` (
	`id`,
	`tipitaka_page_id`,
	`number`,
	`text`,
	`text_and_occurrence_hash`,
	`created_at`,
	`segment_type_id`
)
SELECT
	`segments`.`id`,
	`segments`.`content_id`,
	`segments`.`number`,
	`segments`.`text`,
	`segments`.`text_and_occurrence_hash`,
	`segments`.`created_at`,
	`segments`.`segment_type_id`
FROM `segments`
INNER JOIN `tipitaka_pages` ON `tipitaka_pages`.`id` = `segments`.`content_id`;
--> statement-breakpoint
DELETE FROM `notifications`
WHERE NOT EXISTS (
	SELECT 1
	FROM `segment_translations`
	INNER JOIN `__new_segments` ON `__new_segments`.`id` = `segment_translations`.`segment_id`
	WHERE `segment_translations`.`id` = `notifications`.`segment_translation_id`
);
--> statement-breakpoint
DELETE FROM `translation_votes`
WHERE NOT EXISTS (
	SELECT 1
	FROM `segment_translations`
	INNER JOIN `__new_segments` ON `__new_segments`.`id` = `segment_translations`.`segment_id`
	WHERE `segment_translations`.`id` = `translation_votes`.`translation_id`
);
--> statement-breakpoint
DELETE FROM `segment_annotation_links`
WHERE `main_segment_id` NOT IN (SELECT `id` FROM `__new_segments`)
	OR `annotation_segment_id` NOT IN (SELECT `id` FROM `__new_segments`);
--> statement-breakpoint
DELETE FROM `segment_metadata`
WHERE `segment_id` NOT IN (SELECT `id` FROM `__new_segments`);
--> statement-breakpoint
DELETE FROM `segment_translations`
WHERE `segment_id` NOT IN (SELECT `id` FROM `__new_segments`);
--> statement-breakpoint
DROP TABLE `segments`;
--> statement-breakpoint
ALTER TABLE `__new_segments` RENAME TO `segments`;
--> statement-breakpoint
CREATE INDEX `segments_tipitaka_page_id_idx` ON `segments` (`tipitaka_page_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `segments_tipitaka_page_id_number_key` ON `segments` (`tipitaka_page_id`,`number`);
--> statement-breakpoint
CREATE UNIQUE INDEX `segments_tipitaka_page_id_text_occurrence_hash_key` ON `segments` (`tipitaka_page_id`,`text_and_occurrence_hash`);
--> statement-breakpoint
CREATE INDEX `segments_text_and_occurrence_hash_idx` ON `segments` (`text_and_occurrence_hash`);
--> statement-breakpoint
CREATE UNIQUE INDEX `segment_translations_id_segment_id_locale_key` ON `segment_translations` (`id`,`segment_id`,`locale`);
--> statement-breakpoint
CREATE TABLE `selected_segment_translations` (
	`segment_id` integer NOT NULL,
	`locale` text NOT NULL,
	`translation_id` integer NOT NULL,
	`selected_by_user_id` text,
	`selected_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	PRIMARY KEY(`segment_id`, `locale`),
	FOREIGN KEY (`translation_id`,`segment_id`,`locale`) REFERENCES `segment_translations`(`id`,`segment_id`,`locale`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`selected_by_user_id`) REFERENCES `users`(`id`) ON UPDATE cascade ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `selected_segment_translations_translation_id_key` ON `selected_segment_translations` (`translation_id`);
--> statement-breakpoint
WITH `owner_selected_translations` AS (
	SELECT
		`segment_translations`.`segment_id`,
		`segment_translations`.`locale`,
		`segment_translations`.`id` AS `translation_id`,
		`pages`.`user_id` AS `selected_by_user_id`,
		ROW_NUMBER() OVER (
			PARTITION BY `segment_translations`.`segment_id`, `segment_translations`.`locale`
			ORDER BY
				`segment_translations`.`point` DESC,
				`segment_translations`.`created_at` DESC,
				`segment_translations`.`id` DESC
		) AS `selection_rank`
	FROM `segment_translations`
	INNER JOIN `segments` ON `segments`.`id` = `segment_translations`.`segment_id`
	INNER JOIN `pages` ON `pages`.`id` = `segments`.`tipitaka_page_id`
	INNER JOIN `translation_votes`
		ON `translation_votes`.`translation_id` = `segment_translations`.`id`
		AND `translation_votes`.`user_id` = `pages`.`user_id`
		AND `translation_votes`.`is_upvote` = 1
)
INSERT INTO `selected_segment_translations` (
	`segment_id`,
	`locale`,
	`translation_id`,
	`selected_by_user_id`
)
SELECT
	`segment_id`,
	`locale`,
	`translation_id`,
	`selected_by_user_id`
FROM `owner_selected_translations`
WHERE `selection_rank` = 1;
--> statement-breakpoint
CREATE TABLE `__new_page_locale_translation_proofs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`page_id` integer NOT NULL,
	`locale` text NOT NULL,
	`translation_proof_status` text DEFAULT 'MACHINE_DRAFT' NOT NULL,
	FOREIGN KEY (`page_id`) REFERENCES `tipitaka_pages`(`id`) ON UPDATE cascade ON DELETE cascade,
	CONSTRAINT "page_locale_translation_proofs_status_check" CHECK(`translation_proof_status` IN ('MACHINE_DRAFT', 'HUMAN_TOUCHED', 'PROOFREAD', 'VALIDATED'))
);
--> statement-breakpoint
INSERT INTO `__new_page_locale_translation_proofs` (
	`id`,
	`page_id`,
	`locale`,
	`translation_proof_status`
)
SELECT
	`proof`.`id`,
	`proof`.`page_id`,
	`proof`.`locale`,
	`proof`.`translation_proof_status`
FROM `page_locale_translation_proofs` AS `proof`
INNER JOIN `tipitaka_pages` ON `tipitaka_pages`.`id` = `proof`.`page_id`;
--> statement-breakpoint
DROP TABLE `page_locale_translation_proofs`;
--> statement-breakpoint
ALTER TABLE `__new_page_locale_translation_proofs` RENAME TO `page_locale_translation_proofs`;
--> statement-breakpoint
CREATE UNIQUE INDEX `page_locale_translation_proofs_page_id_locale_key` ON `page_locale_translation_proofs` (`page_id`,`locale`);
--> statement-breakpoint
CREATE INDEX `page_locale_translation_proofs_translation_proof_status_idx` ON `page_locale_translation_proofs` (`translation_proof_status`);
--> statement-breakpoint
CREATE TABLE `__new_translation_jobs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`page_id` integer NOT NULL,
	`user_id` text,
	`locale` text NOT NULL,
	`ai_model` text NOT NULL,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`progress` integer DEFAULT 0 NOT NULL,
	`error` text DEFAULT '' NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`page_id`) REFERENCES `tipitaka_pages`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE cascade ON DELETE set null,
	CONSTRAINT "translation_jobs_status_check" CHECK(`status` IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED'))
);
--> statement-breakpoint
INSERT INTO `__new_translation_jobs` (
	`id`,
	`page_id`,
	`user_id`,
	`locale`,
	`ai_model`,
	`status`,
	`progress`,
	`error`,
	`created_at`,
	`updated_at`
)
SELECT
	`job`.`id`,
	`job`.`page_id`,
	`job`.`user_id`,
	`job`.`locale`,
	`job`.`ai_model`,
	`job`.`status`,
	`job`.`progress`,
	`job`.`error`,
	`job`.`created_at`,
	`job`.`updated_at`
FROM `translation_jobs` AS `job`
INNER JOIN `tipitaka_pages` ON `tipitaka_pages`.`id` = `job`.`page_id`;
--> statement-breakpoint
DROP TABLE `translation_jobs`;
--> statement-breakpoint
ALTER TABLE `__new_translation_jobs` RENAME TO `translation_jobs`;
--> statement-breakpoint
CREATE INDEX `translation_jobs_userId_idx` ON `translation_jobs` (`user_id`);
--> statement-breakpoint
DROP TABLE `pages`;
--> statement-breakpoint
DROP TABLE `personal_access_tokens`;
--> statement-breakpoint
DROP TABLE `translation_contexts`;