PRAGMA foreign_keys=OFF;
--> statement-breakpoint
CREATE TABLE `__retained_tipitaka_page_ids` (
	`id` integer PRIMARY KEY NOT NULL
);
--> statement-breakpoint
INSERT INTO `__retained_tipitaka_page_ids` (`id`)
WITH RECURSIVE `visible_pages`(`id`) AS (
	SELECT `id`
	FROM `tipitaka_pages`
	WHERE `parent_id` IS NULL AND `is_visible` = 1
	UNION ALL
	SELECT `page`.`id`
	FROM `tipitaka_pages` AS `page`
	INNER JOIN `visible_pages` AS `parent` ON `page`.`parent_id` = `parent`.`id`
	WHERE `page`.`is_visible` = 1
)
SELECT `id` FROM `visible_pages`;
--> statement-breakpoint
CREATE TABLE `__retained_segment_ids` (
	`id` integer PRIMARY KEY NOT NULL
);
--> statement-breakpoint
INSERT INTO `__retained_segment_ids` (`id`)
SELECT `id`
FROM `segments`
WHERE `tipitaka_page_id` IN (SELECT `id` FROM `__retained_tipitaka_page_ids`);
--> statement-breakpoint
DELETE FROM `notifications`
WHERE `segment_translation_id` IN (
	SELECT `id`
	FROM `segment_translations`
	WHERE `segment_id` NOT IN (SELECT `id` FROM `__retained_segment_ids`)
);
--> statement-breakpoint
DELETE FROM `translation_votes`
WHERE `translation_id` IN (
	SELECT `id`
	FROM `segment_translations`
	WHERE `segment_id` NOT IN (SELECT `id` FROM `__retained_segment_ids`)
);
--> statement-breakpoint
DELETE FROM `selected_segment_translations`
WHERE `segment_id` NOT IN (SELECT `id` FROM `__retained_segment_ids`);
--> statement-breakpoint
DELETE FROM `segment_translations`
WHERE `segment_id` NOT IN (SELECT `id` FROM `__retained_segment_ids`);
--> statement-breakpoint
DELETE FROM `segment_metadata`
WHERE `segment_id` NOT IN (SELECT `id` FROM `__retained_segment_ids`);
--> statement-breakpoint
DELETE FROM `segment_annotation_links`
WHERE `main_segment_id` NOT IN (SELECT `id` FROM `__retained_segment_ids`)
	OR `annotation_segment_id` NOT IN (SELECT `id` FROM `__retained_segment_ids`);
--> statement-breakpoint
DELETE FROM `translation_jobs`
WHERE `page_id` NOT IN (SELECT `id` FROM `__retained_tipitaka_page_ids`);
--> statement-breakpoint
DELETE FROM `page_locale_translation_proofs`
WHERE `page_id` NOT IN (SELECT `id` FROM `__retained_tipitaka_page_ids`);
--> statement-breakpoint
DROP INDEX `segment_annotation_links_annotation_segment_id_idx`;
--> statement-breakpoint
DROP INDEX `segment_annotation_links_main_segment_id_idx`;
--> statement-breakpoint
ALTER TABLE `segment_annotation_links` RENAME TO `__old_segment_annotation_links`;
--> statement-breakpoint
CREATE TABLE `__new_tipitaka_pages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`parent_id` integer,
	`import_file_id` integer,
	`catalog_key` text NOT NULL,
	`slug` text NOT NULL,
	`text_level` text,
	`position` integer DEFAULT 0 NOT NULL,
	`mdast_json` text NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`parent_id`) REFERENCES `tipitaka_pages`(`id`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`import_file_id`) REFERENCES `import_files`(`id`) ON UPDATE cascade ON DELETE set null,
	CONSTRAINT `tipitaka_pages_text_level_check` CHECK(`text_level` IS NULL OR `text_level` IN ('MULA', 'ATTHAKATHA', 'TIKA', 'OTHER')),
	CONSTRAINT `tipitaka_pages_root_text_level_check` CHECK(`parent_id` IS NOT NULL OR `text_level` IS NULL),
	CONSTRAINT `tipitaka_pages_position_check` CHECK(`position` >= 0)
);
--> statement-breakpoint
INSERT INTO `__new_tipitaka_pages` (
	`id`,
	`parent_id`,
	`import_file_id`,
	`catalog_key`,
	`slug`,
	`text_level`,
	`position`,
	`mdast_json`,
	`created_at`,
	`updated_at`
)
SELECT
	`page`.`id`,
	`page`.`parent_id`,
	`page`.`import_file_id`,
	`page`.`slug`,
	`page`.`slug`,
	CASE
		WHEN `page`.`kind` IN ('ROOT', 'CATEGORY') THEN NULL
		WHEN `page`.`slug` GLOB 'tipitaka-e*' THEN 'OTHER'
		WHEN `page`.`kind` = 'TEXT' THEN 'MULA'
		ELSE COALESCE(
			(
				SELECT CASE upper(`segment_type`.`label`)
					WHEN 'ATTHAKATHA' THEN 'ATTHAKATHA'
					WHEN 'TIKA' THEN 'TIKA'
				END
				FROM `segments` AS `segment`
				INNER JOIN `segment_types` AS `segment_type`
					ON `segment_type`.`id` = `segment`.`segment_type_id`
				WHERE `segment`.`tipitaka_page_id` = `page`.`id`
				ORDER BY `segment`.`number`, `segment`.`id`
				LIMIT 1
			),
			'ATTHAKATHA'
		)
	END,
	`page`.`position`,
	`page`.`mdast_json`,
	`page`.`created_at`,
	`page`.`updated_at`
FROM `tipitaka_pages` AS `page`
WHERE `page`.`id` IN (SELECT `id` FROM `__retained_tipitaka_page_ids`);
--> statement-breakpoint
DROP TABLE `tipitaka_pages`;
--> statement-breakpoint
ALTER TABLE `__new_tipitaka_pages` RENAME TO `tipitaka_pages`;
--> statement-breakpoint
CREATE INDEX `tipitaka_pages_parent_id_idx` ON `tipitaka_pages` (`parent_id`);
--> statement-breakpoint
CREATE INDEX `tipitaka_pages_import_file_id_idx` ON `tipitaka_pages` (`import_file_id`);
--> statement-breakpoint
CREATE INDEX `tipitaka_pages_parent_position_id_idx` ON `tipitaka_pages` (`parent_id`, `position`, `id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `tipitaka_pages_catalog_key_key` ON `tipitaka_pages` (`catalog_key`);
--> statement-breakpoint
CREATE UNIQUE INDEX `tipitaka_pages_slug_key` ON `tipitaka_pages` (`slug`);
--> statement-breakpoint
CREATE UNIQUE INDEX `tipitaka_pages_single_root_key` ON `tipitaka_pages` (1) WHERE `parent_id` IS NULL;
--> statement-breakpoint
CREATE TABLE `tipitaka_page_annotation_targets` (
	`annotation_page_id` integer NOT NULL,
	`target_page_id` integer NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`annotation_page_id`, `target_page_id`),
	FOREIGN KEY (`annotation_page_id`) REFERENCES `tipitaka_pages`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`target_page_id`) REFERENCES `tipitaka_pages`(`id`) ON UPDATE cascade ON DELETE cascade,
	CONSTRAINT `tipitaka_page_annotation_targets_distinct_pages_check` CHECK(`annotation_page_id` <> `target_page_id`),
	CONSTRAINT `tipitaka_page_annotation_targets_position_check` CHECK(`position` >= 0)
);
--> statement-breakpoint
CREATE INDEX `tipitaka_page_annotation_targets_target_page_id_idx` ON `tipitaka_page_annotation_targets` (`target_page_id`);
--> statement-breakpoint
CREATE TABLE `__new_segments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tipitaka_page_id` integer NOT NULL,
	`number` integer NOT NULL,
	`text` text NOT NULL,
	`text_and_occurrence_hash` text NOT NULL,
	`source_book_code` text,
	`source_paragraph_number` text,
	`source_paragraph_occurrence` integer,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`tipitaka_page_id`) REFERENCES `tipitaka_pages`(`id`) ON UPDATE cascade ON DELETE cascade,
	CONSTRAINT `segments_source_paragraph_locator_check` CHECK((`source_paragraph_number` IS NULL AND `source_paragraph_occurrence` IS NULL) OR (`source_paragraph_number` IS NOT NULL AND `source_paragraph_occurrence` >= 1))
);
--> statement-breakpoint
INSERT INTO `__new_segments` (
	`id`,
	`tipitaka_page_id`,
	`number`,
	`text`,
	`text_and_occurrence_hash`,
	`source_book_code`,
	`source_paragraph_number`,
	`source_paragraph_occurrence`,
	`created_at`
)
SELECT
	`segment`.`id`,
	`segment`.`tipitaka_page_id`,
	`segment`.`number`,
	`segment`.`text`,
	`segment`.`text_and_occurrence_hash`,
	NULL,
	CASE
		WHEN `paragraph`.`value` IS NULL THEN NULL
		WHEN instr(`paragraph`.`value`, '__ch') > 0
			THEN substr(`paragraph`.`value`, 1, instr(`paragraph`.`value`, '__ch') - 1)
		ELSE `paragraph`.`value`
	END,
	CASE WHEN `paragraph`.`value` IS NULL THEN NULL ELSE 1 END,
	`segment`.`created_at`
FROM `segments` AS `segment`
LEFT JOIN (
	SELECT `metadata`.`segment_id`, min(`metadata`.`value`) AS `value`
	FROM `segment_metadata` AS `metadata`
	INNER JOIN `segment_metadata_types` AS `metadata_type`
		ON `metadata_type`.`id` = `metadata`.`metadata_type_id`
	WHERE `metadata_type`.`key` = 'PARAGRAPH_NUMBER'
	GROUP BY `metadata`.`segment_id`
) AS `paragraph` ON `paragraph`.`segment_id` = `segment`.`id`
WHERE `segment`.`id` IN (SELECT `id` FROM `__retained_segment_ids`);
--> statement-breakpoint
DROP TABLE `segments`;
--> statement-breakpoint
ALTER TABLE `__new_segments` RENAME TO `segments`;
--> statement-breakpoint
CREATE INDEX `segments_tipitaka_page_id_idx` ON `segments` (`tipitaka_page_id`);
--> statement-breakpoint
CREATE INDEX `segments_source_locator_idx` ON `segments` (`tipitaka_page_id`, `source_book_code`, `source_paragraph_number`, `source_paragraph_occurrence`, `number`);
--> statement-breakpoint
CREATE UNIQUE INDEX `segments_tipitaka_page_id_number_key` ON `segments` (`tipitaka_page_id`, `number`);
--> statement-breakpoint
CREATE UNIQUE INDEX `segments_tipitaka_page_id_text_occurrence_hash_key` ON `segments` (`tipitaka_page_id`, `text_and_occurrence_hash`);
--> statement-breakpoint
CREATE INDEX `segments_text_and_occurrence_hash_idx` ON `segments` (`text_and_occurrence_hash`);
--> statement-breakpoint
CREATE TABLE `segment_annotation_links` (
	`target_segment_id` integer NOT NULL,
	`annotation_segment_id` integer NOT NULL,
	PRIMARY KEY(`target_segment_id`, `annotation_segment_id`),
	FOREIGN KEY (`annotation_segment_id`) REFERENCES `segments`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`target_segment_id`) REFERENCES `segments`(`id`) ON UPDATE cascade ON DELETE cascade,
	CONSTRAINT `segment_annotation_links_distinct_segments_check` CHECK(`target_segment_id` <> `annotation_segment_id`)
);
--> statement-breakpoint
INSERT INTO `segment_annotation_links` (`target_segment_id`, `annotation_segment_id`)
SELECT `main_segment_id`, `annotation_segment_id`
FROM `__old_segment_annotation_links`
WHERE `main_segment_id` <> `annotation_segment_id`;
--> statement-breakpoint
CREATE INDEX `segment_annotation_links_annotation_segment_id_idx` ON `segment_annotation_links` (`annotation_segment_id`);
--> statement-breakpoint
DELETE FROM `segment_metadata`
WHERE `metadata_type_id` IN (
	SELECT `id` FROM `segment_metadata_types` WHERE `key` = 'PARAGRAPH_NUMBER'
);
--> statement-breakpoint
DELETE FROM `segment_metadata_types` WHERE `key` = 'PARAGRAPH_NUMBER';
--> statement-breakpoint
DROP TABLE `__old_segment_annotation_links`;
--> statement-breakpoint
DROP TABLE `segment_types`;
--> statement-breakpoint
DROP TABLE `__retained_segment_ids`;
--> statement-breakpoint
DROP TABLE `__retained_tipitaka_page_ids`;
--> statement-breakpoint
PRAGMA foreign_keys=ON;
