DELETE FROM `notifications`
WHERE
	`user_id` IN (SELECT `id` FROM `users` WHERE `handle` = 'tipitaka')
	OR `actor_id` IN (SELECT `id` FROM `users` WHERE `handle` = 'tipitaka')
	OR `segment_translation_id` IN (
		SELECT `segment_translations`.`id`
		FROM `segment_translations`
		JOIN `users` ON `users`.`id` = `segment_translations`.`user_id`
		WHERE `users`.`handle` = 'tipitaka'
	);
--> statement-breakpoint
DELETE FROM `translation_votes`
WHERE
	`user_id` IN (SELECT `id` FROM `users` WHERE `handle` = 'tipitaka')
	OR `translation_id` IN (
		SELECT `segment_translations`.`id`
		FROM `segment_translations`
		JOIN `users` ON `users`.`id` = `segment_translations`.`user_id`
		WHERE `users`.`handle` = 'tipitaka'
	);
--> statement-breakpoint
DELETE FROM `selected_segment_translations`
WHERE `translation_id` IN (
	SELECT `segment_translations`.`id`
	FROM `segment_translations`
	JOIN `users` ON `users`.`id` = `segment_translations`.`user_id`
	WHERE `users`.`handle` = 'tipitaka'
);
--> statement-breakpoint
UPDATE `selected_segment_translations`
SET `selected_by_user_id` = NULL
WHERE `selected_by_user_id` IN (
	SELECT `id` FROM `users` WHERE `handle` = 'tipitaka'
);
--> statement-breakpoint
UPDATE `translation_jobs`
SET `user_id` = NULL
WHERE `user_id` IN (SELECT `id` FROM `users` WHERE `handle` = 'tipitaka');
--> statement-breakpoint
DELETE FROM `segment_translations`
WHERE `user_id` IN (SELECT `id` FROM `users` WHERE `handle` = 'tipitaka');
--> statement-breakpoint
DELETE FROM `user_settings`
WHERE `user_id` IN (SELECT `id` FROM `users` WHERE `handle` = 'tipitaka');
--> statement-breakpoint
DELETE FROM `gemini_api_keys`
WHERE `user_id` IN (SELECT `id` FROM `users` WHERE `handle` = 'tipitaka');
--> statement-breakpoint
DELETE FROM `sessions`
WHERE `user_id` IN (SELECT `id` FROM `users` WHERE `handle` = 'tipitaka');
--> statement-breakpoint
DELETE FROM `accounts`
WHERE `user_id` IN (SELECT `id` FROM `users` WHERE `handle` = 'tipitaka');
--> statement-breakpoint
DELETE FROM `users` WHERE `handle` = 'tipitaka';