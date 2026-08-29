DELETE FROM `notifications`
WHERE `type` <> 'PAGE_SEGMENT_TRANSLATION_VOTE'
	OR `segment_translation_id` IS NULL;
--> statement-breakpoint
DELETE FROM `segments`
WHERE `content_id` NOT IN (SELECT `id` FROM `pages`);
--> statement-breakpoint
DELETE FROM `notifications`
WHERE `segment_translation_id` IS NULL;