CREATE TABLE `translation_chunk_runs` (
	`translation_job_id` integer NOT NULL,
	`chunk_index` integer NOT NULL,
	`lease_token` text NOT NULL,
	`lease_expires_at` integer NOT NULL,
	`completed_at` integer,
	PRIMARY KEY(`translation_job_id`, `chunk_index`),
	FOREIGN KEY (`translation_job_id`) REFERENCES `translation_jobs`(`id`) ON UPDATE cascade ON DELETE cascade,
	CONSTRAINT "translation_chunk_runs_chunk_index_check" CHECK("translation_chunk_runs"."chunk_index" >= 0)
);
