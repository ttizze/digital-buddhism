CREATE TABLE `tipitaka_read_model_jobs` (
	`page_id` integer NOT NULL,
	`locale` text NOT NULL,
	`requested_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`last_error` text DEFAULT '' NOT NULL,
	PRIMARY KEY(`page_id`, `locale`),
	FOREIGN KEY (`page_id`) REFERENCES `tipitaka_pages`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `tipitaka_read_model_jobs_requested_at_idx` ON `tipitaka_read_model_jobs` (`requested_at`);
--> statement-breakpoint
CREATE TRIGGER `segment_translations_read_model_insert`
AFTER INSERT ON `segment_translations`
BEGIN
	INSERT INTO `tipitaka_read_model_jobs` (`page_id`, `locale`)
	SELECT `segments`.`tipitaka_page_id`, NEW.`locale`
	FROM `segments`
	WHERE `segments`.`id` = NEW.`segment_id`
	ON CONFLICT (`page_id`, `locale`) DO UPDATE SET
		`requested_at` = (cast((julianday('now') - 2440587.5)*86400000 as integer)),
		`attempts` = 0,
		`last_error` = '';
END;
--> statement-breakpoint
CREATE TRIGGER `segment_translations_read_model_update`
AFTER UPDATE OF `segment_id`, `locale`, `text`, `point` ON `segment_translations`
BEGIN
	INSERT INTO `tipitaka_read_model_jobs` (`page_id`, `locale`)
	SELECT `segments`.`tipitaka_page_id`, OLD.`locale`
	FROM `segments`
	WHERE `segments`.`id` = OLD.`segment_id`
	ON CONFLICT (`page_id`, `locale`) DO UPDATE SET
		`requested_at` = (cast((julianday('now') - 2440587.5)*86400000 as integer)),
		`attempts` = 0,
		`last_error` = '';
	INSERT INTO `tipitaka_read_model_jobs` (`page_id`, `locale`)
	SELECT `segments`.`tipitaka_page_id`, NEW.`locale`
	FROM `segments`
	WHERE `segments`.`id` = NEW.`segment_id`
	ON CONFLICT (`page_id`, `locale`) DO UPDATE SET
		`requested_at` = (cast((julianday('now') - 2440587.5)*86400000 as integer)),
		`attempts` = 0,
		`last_error` = '';
END;
--> statement-breakpoint
CREATE TRIGGER `segment_translations_read_model_delete`
AFTER DELETE ON `segment_translations`
BEGIN
	INSERT INTO `tipitaka_read_model_jobs` (`page_id`, `locale`)
	SELECT `segments`.`tipitaka_page_id`, OLD.`locale`
	FROM `segments`
	WHERE `segments`.`id` = OLD.`segment_id`
	ON CONFLICT (`page_id`, `locale`) DO UPDATE SET
		`requested_at` = (cast((julianday('now') - 2440587.5)*86400000 as integer)),
		`attempts` = 0,
		`last_error` = '';
END;
--> statement-breakpoint
CREATE TRIGGER `selected_segment_translations_read_model_insert`
AFTER INSERT ON `selected_segment_translations`
BEGIN
	INSERT INTO `tipitaka_read_model_jobs` (`page_id`, `locale`)
	SELECT `segments`.`tipitaka_page_id`, NEW.`locale`
	FROM `segments`
	WHERE `segments`.`id` = NEW.`segment_id`
	ON CONFLICT (`page_id`, `locale`) DO UPDATE SET
		`requested_at` = (cast((julianday('now') - 2440587.5)*86400000 as integer)),
		`attempts` = 0,
		`last_error` = '';
END;
--> statement-breakpoint
CREATE TRIGGER `selected_segment_translations_read_model_update`
AFTER UPDATE OF `segment_id`, `locale`, `translation_id` ON `selected_segment_translations`
BEGIN
	INSERT INTO `tipitaka_read_model_jobs` (`page_id`, `locale`)
	SELECT `segments`.`tipitaka_page_id`, OLD.`locale`
	FROM `segments`
	WHERE `segments`.`id` = OLD.`segment_id`
	ON CONFLICT (`page_id`, `locale`) DO UPDATE SET
		`requested_at` = (cast((julianday('now') - 2440587.5)*86400000 as integer)),
		`attempts` = 0,
		`last_error` = '';
	INSERT INTO `tipitaka_read_model_jobs` (`page_id`, `locale`)
	SELECT `segments`.`tipitaka_page_id`, NEW.`locale`
	FROM `segments`
	WHERE `segments`.`id` = NEW.`segment_id`
	ON CONFLICT (`page_id`, `locale`) DO UPDATE SET
		`requested_at` = (cast((julianday('now') - 2440587.5)*86400000 as integer)),
		`attempts` = 0,
		`last_error` = '';
END;
--> statement-breakpoint
CREATE TRIGGER `selected_segment_translations_read_model_delete`
AFTER DELETE ON `selected_segment_translations`
BEGIN
	INSERT INTO `tipitaka_read_model_jobs` (`page_id`, `locale`)
	SELECT `segments`.`tipitaka_page_id`, OLD.`locale`
	FROM `segments`
	WHERE `segments`.`id` = OLD.`segment_id`
	ON CONFLICT (`page_id`, `locale`) DO UPDATE SET
		`requested_at` = (cast((julianday('now') - 2440587.5)*86400000 as integer)),
		`attempts` = 0,
		`last_error` = '';
END;
--> statement-breakpoint
CREATE TRIGGER `translation_jobs_read_model_insert`
AFTER INSERT ON `translation_jobs`
BEGIN
	INSERT INTO `tipitaka_read_model_jobs` (`page_id`, `locale`)
	VALUES (NEW.`page_id`, NEW.`locale`)
	ON CONFLICT (`page_id`, `locale`) DO UPDATE SET
		`requested_at` = (cast((julianday('now') - 2440587.5)*86400000 as integer)),
		`attempts` = 0,
		`last_error` = '';
END;
--> statement-breakpoint
CREATE TRIGGER `translation_jobs_read_model_update`
AFTER UPDATE OF `page_id`, `locale`, `status` ON `translation_jobs`
BEGIN
	INSERT INTO `tipitaka_read_model_jobs` (`page_id`, `locale`)
	VALUES (OLD.`page_id`, OLD.`locale`)
	ON CONFLICT (`page_id`, `locale`) DO UPDATE SET
		`requested_at` = (cast((julianday('now') - 2440587.5)*86400000 as integer)),
		`attempts` = 0,
		`last_error` = '';
	INSERT INTO `tipitaka_read_model_jobs` (`page_id`, `locale`)
	VALUES (NEW.`page_id`, NEW.`locale`)
	ON CONFLICT (`page_id`, `locale`) DO UPDATE SET
		`requested_at` = (cast((julianday('now') - 2440587.5)*86400000 as integer)),
		`attempts` = 0,
		`last_error` = '';
END;
--> statement-breakpoint
CREATE TRIGGER `translation_jobs_read_model_delete`
AFTER DELETE ON `translation_jobs`
BEGIN
	INSERT INTO `tipitaka_read_model_jobs` (`page_id`, `locale`)
	VALUES (OLD.`page_id`, OLD.`locale`)
	ON CONFLICT (`page_id`, `locale`) DO UPDATE SET
		`requested_at` = (cast((julianday('now') - 2440587.5)*86400000 as integer)),
		`attempts` = 0,
		`last_error` = '';
END;