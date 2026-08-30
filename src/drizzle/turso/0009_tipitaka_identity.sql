ALTER TABLE `users` ALTER COLUMN "image" TO "image" text NOT NULL DEFAULT '/avatar.png';--> statement-breakpoint
UPDATE `users`
SET
	`handle` = 'tipitaka',
	`name` = 'Tipiṭaka',
	`image` = CASE
		WHEN `image` LIKE '%evame.tech/%' THEN '/favicon.svg'
		ELSE `image`
	END
WHERE `handle` = 'evame';
