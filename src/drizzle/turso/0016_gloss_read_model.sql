CREATE TRIGGER `selected_segment_gloss_sets_read_model_insert`
AFTER INSERT ON `selected_segment_gloss_sets`
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
CREATE TRIGGER `selected_segment_gloss_sets_read_model_update`
AFTER UPDATE OF `segment_id`, `locale`, `gloss_set_id` ON `selected_segment_gloss_sets`
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
CREATE TRIGGER `selected_segment_gloss_sets_read_model_delete`
BEFORE DELETE ON `selected_segment_gloss_sets`
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
CREATE TRIGGER `segment_gloss_units_read_model_insert`
AFTER INSERT ON `segment_gloss_units`
BEGIN
	INSERT INTO `tipitaka_read_model_jobs` (`page_id`, `locale`)
	SELECT `segments`.`tipitaka_page_id`, `selected`.`locale`
	FROM `selected_segment_gloss_sets` AS `selected`
	JOIN `segments` ON `segments`.`id` = `selected`.`segment_id`
	WHERE `selected`.`gloss_set_id` = NEW.`gloss_set_id`
	ON CONFLICT (`page_id`, `locale`) DO UPDATE SET
		`requested_at` = (cast((julianday('now') - 2440587.5)*86400000 as integer)),
		`attempts` = 0,
		`last_error` = '';
END;
--> statement-breakpoint
CREATE TRIGGER `segment_gloss_units_read_model_update`
AFTER UPDATE OF `gloss_set_id`, `position`, `start_offset`, `end_offset`, `surface`, `gloss`, `point` ON `segment_gloss_units`
BEGIN
	INSERT INTO `tipitaka_read_model_jobs` (`page_id`, `locale`)
	SELECT `segments`.`tipitaka_page_id`, `selected`.`locale`
	FROM `selected_segment_gloss_sets` AS `selected`
	JOIN `segments` ON `segments`.`id` = `selected`.`segment_id`
	WHERE `selected`.`gloss_set_id` = OLD.`gloss_set_id`
	ON CONFLICT (`page_id`, `locale`) DO UPDATE SET
		`requested_at` = (cast((julianday('now') - 2440587.5)*86400000 as integer)),
		`attempts` = 0,
		`last_error` = '';
	INSERT INTO `tipitaka_read_model_jobs` (`page_id`, `locale`)
	SELECT `segments`.`tipitaka_page_id`, `selected`.`locale`
	FROM `selected_segment_gloss_sets` AS `selected`
	JOIN `segments` ON `segments`.`id` = `selected`.`segment_id`
	WHERE `selected`.`gloss_set_id` = NEW.`gloss_set_id`
	ON CONFLICT (`page_id`, `locale`) DO UPDATE SET
		`requested_at` = (cast((julianday('now') - 2440587.5)*86400000 as integer)),
		`attempts` = 0,
		`last_error` = '';
END;
--> statement-breakpoint
CREATE TRIGGER `segment_gloss_units_read_model_delete`
BEFORE DELETE ON `segment_gloss_units`
BEGIN
	INSERT INTO `tipitaka_read_model_jobs` (`page_id`, `locale`)
	SELECT `segments`.`tipitaka_page_id`, `selected`.`locale`
	FROM `selected_segment_gloss_sets` AS `selected`
	JOIN `segments` ON `segments`.`id` = `selected`.`segment_id`
	WHERE `selected`.`gloss_set_id` = OLD.`gloss_set_id`
	ON CONFLICT (`page_id`, `locale`) DO UPDATE SET
		`requested_at` = (cast((julianday('now') - 2440587.5)*86400000 as integer)),
		`attempts` = 0,
		`last_error` = '';
END;
