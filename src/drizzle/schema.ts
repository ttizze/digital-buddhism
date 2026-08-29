import { sql } from "drizzle-orm";
import {
	check,
	foreignKey,
	index,
	integer,
	primaryKey,
	sqliteTable,
	text,
	unique,
	uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const contentKind = {
	enumValues: ["PAGE", "PAGE_COMMENT"],
} as const;
export const notificationType = {
	enumValues: [
		"FOLLOW",
		"PAGE_COMMENT",
		"PAGE_LIKE",
		"PAGE_SEGMENT_TRANSLATION_VOTE",
		"PAGE_COMMENT_SEGMENT_TRANSLATION_VOTE",
	],
} as const;
export const pageStatus = {
	enumValues: ["DRAFT", "PUBLIC", "ARCHIVE"],
} as const;
export const segmentTypeKey = {
	enumValues: ["PRIMARY", "COMMENTARY"],
} as const;
export const translationProofStatus = {
	enumValues: ["MACHINE_DRAFT", "HUMAN_TOUCHED", "PROOFREAD", "VALIDATED"],
} as const;
export const translationStatus = {
	enumValues: ["PENDING", "IN_PROGRESS", "COMPLETED", "FAILED"],
} as const;

export const accounts = sqliteTable(
	"accounts",
	{
		userId: text("user_id").notNull(),
		providerId: text("provider_id").notNull(),
		accountId: text("account_id").notNull(),
		refreshToken: text("refresh_token"),
		accessToken: text("access_token"),
		scope: text(),
		idToken: text("id_token"),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.defaultNow()
			.notNull(),
		id: text().primaryKey().notNull(),
		password: text(),
		refreshTokenExpiresAt: integer("refresh_token_expires_at", {
			mode: "timestamp_ms",
		}),
		updatedAt: integer("updated_at", { mode: "timestamp_ms" })
			.defaultNow()
			.notNull(),
		accessTokenExpiresAt: integer("access_token_expires_at", {
			mode: "timestamp_ms",
		}),
	},
	(table) => [
		uniqueIndex("accounts_provider_accountId_key").on(
			table.providerId,
			table.accountId,
		),
		foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "accounts_userId_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);

export const contents = sqliteTable(
	"contents",
	{
		id: integer().primaryKey({ autoIncrement: true }).notNull(),
		kind: text("kind", { enum: contentKind.enumValues }).notNull(),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.defaultNow()
			.notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp_ms" })
			.defaultNow()
			.notNull(),
		importFileId: integer("import_file_id"),
	},
	(table) => [
		check(
			"contents_kind_check",
			sql`${table.kind} IN ('PAGE', 'PAGE_COMMENT')`,
		),
		index("contents_kind_idx").on(table.kind),
		foreignKey({
			columns: [table.importFileId],
			foreignColumns: [importFiles.id],
			name: "contents_import_file_id_fkey",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
	],
);

export const personalAccessTokens = sqliteTable(
	"personal_access_tokens",
	{
		id: integer().primaryKey({ autoIncrement: true }).notNull(),
		keyHash: text("key_hash").notNull(),
		userId: text("user_id").notNull(),
		name: text().default("").notNull(),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.defaultNow()
			.notNull(),
		lastUsedAt: integer("last_used_at", { mode: "timestamp_ms" }),
	},
	(table) => [
		uniqueIndex("personal_access_tokens_key_hash_key").on(table.keyHash),
		index("personal_access_tokens_user_id_idx").on(table.userId),
		foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "personal_access_tokens_user_id_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);

export const importFiles = sqliteTable(
	"import_files",
	{
		id: integer().primaryKey({ autoIncrement: true }).notNull(),
		importRunId: integer("import_run_id").notNull(),
		path: text().notNull(),
		checksum: text().notNull(),
		status: text().default("PENDING").notNull(),
		message: text().default("").notNull(),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		foreignKey({
			columns: [table.importRunId],
			foreignColumns: [importRuns.id],
			name: "import_files_import_run_id_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);

export const follows = sqliteTable(
	"follows",
	{
		id: integer().primaryKey({ autoIncrement: true }).notNull(),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.defaultNow()
			.notNull(),
		followerId: text("follower_id").notNull(),
		followingId: text("following_id").notNull(),
	},
	(table) => [
		index("follows_follower_id_idx").on(table.followerId),
		index("follows_following_id_idx").on(table.followingId),
		foreignKey({
			columns: [table.followerId],
			foreignColumns: [users.id],
			name: "follows_follower_id_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.followingId],
			foreignColumns: [users.id],
			name: "follows_following_id_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		unique("follows_follower_id_following_id_key").on(
			table.followerId,
			table.followingId,
		),
	],
);

export const geminiApiKeys = sqliteTable(
	"gemini_api_keys",
	{
		id: integer().primaryKey({ autoIncrement: true }).notNull(),
		apiKey: text("api_key").default("").notNull(),
		userId: text("user_id").notNull(),
	},
	(table) => [
		index("gemini_api_keys_user_id_idx").on(table.userId),
		uniqueIndex("gemini_api_keys_user_id_key").on(table.userId),
		foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "gemini_api_keys_user_id_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);

export const importRuns = sqliteTable("import_runs", {
	id: integer().primaryKey({ autoIncrement: true }).notNull(),
	startedAt: integer("started_at", { mode: "timestamp_ms" })
		.defaultNow()
		.notNull(),
	finishedAt: integer("finished_at", { mode: "timestamp_ms" }),
	status: text().default("RUNNING").notNull(),
});

export const likePages = sqliteTable(
	"like_pages",
	{
		id: integer().primaryKey({ autoIncrement: true }).notNull(),
		pageId: integer("page_id").notNull(),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.defaultNow()
			.notNull(),
		userId: text("user_id"),
	},
	(table) => [
		index("like_pages_page_id_idx").on(table.pageId),
		index("like_pages_user_id_idx").on(table.userId),
		uniqueIndex("like_pages_user_id_page_id_key").on(
			table.userId,
			table.pageId,
		),
		foreignKey({
			columns: [table.pageId],
			foreignColumns: [pages.id],
			name: "like_pages_page_id_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "like_pages_user_id_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);

export const notifications = sqliteTable(
	"notifications",
	{
		id: integer().primaryKey({ autoIncrement: true }).notNull(),
		userId: text("user_id").notNull(),
		type: text("type", { enum: notificationType.enumValues }).notNull(),
		read: integer({ mode: "boolean" }).default(false).notNull(),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.defaultNow()
			.notNull(),
		actorId: text("actor_id").notNull(),
		pageCommentId: integer("page_comment_id"),
		pageId: integer("page_id"),
		segmentTranslationId: integer("segment_translation_id"),
	},
	(table) => [
		check(
			"notifications_type_check",
			sql`${table.type} IN ('FOLLOW', 'PAGE_COMMENT', 'PAGE_LIKE', 'PAGE_SEGMENT_TRANSLATION_VOTE', 'PAGE_COMMENT_SEGMENT_TRANSLATION_VOTE')`,
		),
		index("notifications_actor_id_idx").on(table.actorId),
		index("notifications_user_id_idx").on(table.userId),
		foreignKey({
			columns: [table.actorId],
			foreignColumns: [users.id],
			name: "notifications_actor_id_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.pageCommentId],
			foreignColumns: [pageComments.id],
			name: "notifications_page_comment_id_fkey",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		foreignKey({
			columns: [table.pageId],
			foreignColumns: [pages.id],
			name: "notifications_page_id_fkey",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		foreignKey({
			columns: [table.segmentTranslationId],
			foreignColumns: [segmentTranslations.id],
			name: "notifications_segment_translation_id_fkey",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "notifications_user_id_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);

export const segmentTypes = sqliteTable(
	"segment_types",
	{
		id: integer().primaryKey({ autoIncrement: true }).notNull(),
		label: text().notNull(),
		key: text("key", { enum: segmentTypeKey.enumValues }).notNull(),
	},
	(table) => [
		check(
			"segment_types_key_check",
			sql`${table.key} IN ('PRIMARY', 'COMMENTARY')`,
		),
		index("segment_types_key_idx").on(table.key),
		uniqueIndex("segment_types_key_label_key").on(table.key, table.label),
		index("segment_types_label_idx").on(table.label),
	],
);

export const translationJobs = sqliteTable(
	"translation_jobs",
	{
		id: integer().primaryKey({ autoIncrement: true }).notNull(),
		pageId: integer("page_id").notNull(),
		userId: text("user_id"),
		locale: text().notNull(),
		aiModel: text("ai_model").notNull(),
		status: text("status", { enum: translationStatus.enumValues })
			.default("PENDING")
			.notNull(),
		progress: integer().default(0).notNull(),
		error: text().default("").notNull(),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.defaultNow()
			.notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp_ms" })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		check(
			"translation_jobs_status_check",
			sql`${table.status} IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED')`,
		),
		index("translation_jobs_userId_idx").on(table.userId),
		foreignKey({
			columns: [table.pageId],
			foreignColumns: [pages.id],
			name: "translation_jobs_pageId_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "translation_jobs_userId_fkey",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
	],
);

export const segmentTranslations = sqliteTable(
	"segment_translations",
	{
		id: integer().primaryKey({ autoIncrement: true }).notNull(),
		segmentId: integer("segment_id").notNull(),
		locale: text().notNull(),
		text: text().notNull(),
		point: integer().default(0).notNull(),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.defaultNow()
			.notNull(),
		userId: text("user_id").notNull(),
	},
	(table) => [
		index("segment_translations_segment_id_locale_idx").on(
			table.segmentId,
			table.locale,
		),
		index("segment_translations_user_id_idx").on(table.userId),
		foreignKey({
			columns: [table.segmentId],
			foreignColumns: [segments.id],
			name: "segment_translations_segment_id_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "segment_translations_user_id_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);

export const pageViews = sqliteTable(
	"page_views",
	{
		pageId: integer("page_id").primaryKey().notNull(),
		count: integer().default(0).notNull(),
	},
	(table) => [
		foreignKey({
			columns: [table.pageId],
			foreignColumns: [pages.id],
			name: "page_views_pageId_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);

export const pageComments = sqliteTable(
	"page_comments",
	{
		id: integer().primaryKey().notNull(),
		pageId: integer("page_id").notNull(),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.defaultNow()
			.notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp_ms" })
			.defaultNow()
			.notNull(),
		locale: text().notNull(),
		userId: text("user_id").notNull(),
		parentId: integer("parent_id"),
		mdastJson: text("mdast_json", { mode: "json" }).notNull(),
		isDeleted: integer("is_deleted", { mode: "boolean" })
			.default(false)
			.notNull(),
		lastReplyAt: integer("last_reply_at", { mode: "timestamp_ms" }),
		replyCount: integer("reply_count").default(0).notNull(),
	},
	(table) => [
		index("page_comments_page_id_parent_id_created_at_idx").on(
			table.pageId,
			table.parentId,
			table.createdAt,
		),
		index("page_comments_parent_id_is_deleted_created_at_idx").on(
			table.parentId,
			table.isDeleted,
			table.createdAt,
		),
		index("page_comments_user_id_idx").on(table.userId),
		foreignKey({
			columns: [table.id],
			foreignColumns: [contents.id],
			name: "page_comments_id_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.pageId],
			foreignColumns: [pages.id],
			name: "page_comments_page_id_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.parentId],
			foreignColumns: [table.id],
			name: "page_comments_parent_id_fkey",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "page_comments_user_id_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);

export const sessions = sqliteTable(
	"sessions",
	{
		token: text().notNull(),
		userId: text("user_id").notNull(),
		expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.defaultNow()
			.notNull(),
		id: text().primaryKey().notNull(),
		ipAddress: text("ip_address"),
		updatedAt: integer("updated_at", { mode: "timestamp_ms" })
			.defaultNow()
			.notNull(),
		userAgent: text("user_agent"),
	},
	(table) => [
		uniqueIndex("sessions_token_key").on(table.token),
		foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "sessions_userId_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);

export const pageLocaleTranslationProofs = sqliteTable(
	"page_locale_translation_proofs",
	{
		id: integer().primaryKey({ autoIncrement: true }).notNull(),
		pageId: integer("page_id").notNull(),
		locale: text().notNull(),
		translationProofStatus: text("translation_proof_status", {
			enum: translationProofStatus.enumValues,
		})
			.default("MACHINE_DRAFT")
			.notNull(),
	},
	(table) => [
		check(
			"page_locale_translation_proofs_status_check",
			sql`${table.translationProofStatus} IN ('MACHINE_DRAFT', 'HUMAN_TOUCHED', 'PROOFREAD', 'VALIDATED')`,
		),
		uniqueIndex("page_locale_translation_proofs_page_id_locale_key").on(
			table.pageId,
			table.locale,
		),
		index("page_locale_translation_proofs_translation_proof_status_idx").on(
			table.translationProofStatus,
		),
		foreignKey({
			columns: [table.pageId],
			foreignColumns: [pages.id],
			name: "page_locale_translation_proofs_page_id_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);

export const segmentMetadataTypes = sqliteTable(
	"segment_metadata_types",
	{
		id: integer().primaryKey({ autoIncrement: true }).notNull(),
		key: text().notNull(),
		label: text().notNull(),
	},
	(table) => [uniqueIndex("segment_metadata_types_key_key").on(table.key)],
);

export const tags = sqliteTable(
	"tags",
	{
		id: integer().primaryKey({ autoIncrement: true }).notNull(),
		name: text().notNull(),
	},
	(table) => [
		index("tags_name_idx").on(table.name),
		uniqueIndex("tags_name_key").on(table.name),
	],
);

export const translationContexts = sqliteTable(
	"translation_contexts",
	{
		id: integer().primaryKey({ autoIncrement: true }).notNull(),
		userId: text("user_id").notNull(),
		name: text().notNull(),
		context: text().notNull(),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.defaultNow()
			.notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp_ms" })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("translation_contexts_user_id_idx").on(table.userId),
		foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "translation_contexts_user_id_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);

export const translationVotes = sqliteTable(
	"translation_votes",
	{
		translationId: integer("translation_id").notNull(),
		userId: text("user_id").notNull(),
		isUpvote: integer("is_upvote", { mode: "boolean" }).notNull(),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.defaultNow()
			.notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp_ms" })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("translation_votes_translation_id_idx").on(table.translationId),
		uniqueIndex("translation_votes_translation_id_user_id_key").on(
			table.translationId,
			table.userId,
		),
		index("translation_votes_user_id_idx").on(table.userId),
		foreignKey({
			columns: [table.translationId],
			foreignColumns: [segmentTranslations.id],
			name: "translation_votes_translation_id_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "translation_votes_user_id_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);

export const pages = sqliteTable(
	"pages",
	{
		id: integer().primaryKey().notNull(),
		slug: text().notNull(),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.defaultNow()
			.notNull(),
		sourceLocale: text("source_locale").default("unknown").notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp_ms" })
			.defaultNow()
			.notNull(),
		status: text("status", { enum: pageStatus.enumValues })
			.default("DRAFT")
			.notNull(),
		userId: text("user_id").notNull(),
		mdastJson: text("mdast_json", { mode: "json" }).notNull(),
		order: integer().default(0).notNull(),
		parentId: integer("parent_id"),
		publishedAt: integer("published_at", { mode: "timestamp_ms" }),
		archivedAt: integer("archived_at", { mode: "timestamp_ms" }),
	},
	(table) => [
		check(
			"pages_status_check",
			sql`${table.status} IN ('DRAFT', 'PUBLIC', 'ARCHIVE')`,
		),
		index("pages_created_at_idx").on(table.createdAt),
		index("pages_parent_id_idx").on(table.parentId),
		index("pages_parent_id_order_idx").on(table.parentId, table.order),
		index("pages_slug_idx").on(table.slug),
		uniqueIndex("pages_slug_key").on(table.slug),
		index("pages_status_created_at_idx").on(table.status, table.createdAt),
		index("pages_status_parent_id_created_at_idx").on(
			table.status,
			table.parentId,
			table.createdAt,
		),
		index("pages_user_id_idx").on(table.userId),
		foreignKey({
			columns: [table.id],
			foreignColumns: [contents.id],
			name: "pages_id_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.parentId],
			foreignColumns: [table.id],
			name: "pages_parent_id_fkey",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "pages_user_id_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);

export const segments = sqliteTable(
	"segments",
	{
		id: integer().primaryKey({ autoIncrement: true }).notNull(),
		contentId: integer("content_id").notNull(),
		number: integer().notNull(),
		text: text().notNull(),
		textAndOccurrenceHash: text("text_and_occurrence_hash").notNull(),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.defaultNow()
			.notNull(),
		segmentTypeId: integer("segment_type_id").notNull(),
	},
	(table) => [
		index("segments_content_id_idx").on(table.contentId),
		uniqueIndex("segments_content_id_number_key").on(
			table.contentId,
			table.number,
		),
		uniqueIndex("segments_content_id_text_and_occurrence_hash_key").on(
			table.contentId,
			table.textAndOccurrenceHash,
		),
		index("segments_text_and_occurrence_hash_idx").on(
			table.textAndOccurrenceHash,
		),
		foreignKey({
			columns: [table.contentId],
			foreignColumns: [contents.id],
			name: "segments_content_id_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.segmentTypeId],
			foreignColumns: [segmentTypes.id],
			name: "segments_segment_type_id_fkey",
		})
			.onUpdate("cascade")
			.onDelete("restrict"),
	],
);

export const segmentMetadata = sqliteTable(
	"segment_metadata",
	{
		id: integer().primaryKey({ autoIncrement: true }).notNull(),
		segmentId: integer("segment_id").notNull(),
		metadataTypeId: integer("metadata_type_id").notNull(),
		value: text().notNull(),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("segment_metadata_metadata_type_id_idx").on(table.metadataTypeId),
		index("segment_metadata_segment_id_idx").on(table.segmentId),
		uniqueIndex("segment_metadata_segment_id_metadata_type_id_value_key").on(
			table.segmentId,
			table.metadataTypeId,
			table.value,
		),
		foreignKey({
			columns: [table.metadataTypeId],
			foreignColumns: [segmentMetadataTypes.id],
			name: "segment_metadata_metadata_type_id_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.segmentId],
			foreignColumns: [segments.id],
			name: "segment_metadata_segment_id_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);

export const verifications = sqliteTable("verifications", {
	id: text().primaryKey().notNull(),
	identifier: text().notNull(),
	value: text().notNull(),
	expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
	createdAt: integer("created_at", { mode: "timestamp_ms" }),
	updatedAt: integer("updated_at", { mode: "timestamp_ms" }),
});

export const users = sqliteTable(
	"users",
	{
		image: text().default("https://evame.tech/avatar.png").notNull(),
		plan: text().default("free").notNull(),
		totalPoints: integer("total_points").default(0).notNull(),
		isAi: integer("is_ai", { mode: "boolean" }).default(false).notNull(),
		provider: text().default("Credentials").notNull(),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.defaultNow()
			.notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp_ms" })
			.defaultNow()
			.notNull(),
		name: text().default("new_user").notNull(),
		handle: text().notNull(),
		profile: text().default("").notNull(),
		id: text().primaryKey().notNull(),
		email: text().notNull(),
		twitterHandle: text("twitter_handle").default("").notNull(),
		emailVerified: integer("email_verified", { mode: "boolean" }),
	},
	(table) => [
		uniqueIndex("users_email_key").on(table.email),
		uniqueIndex("users_handle_key").on(table.handle),
	],
);

export const userSettings = sqliteTable(
	"user_settings",
	{
		id: integer().primaryKey({ autoIncrement: true }).notNull(),
		userId: text("user_id").notNull(),
		targetLocales: text("target_locales", { mode: "json" })
			.$type<string[]>()
			.default(["RAY"])
			.notNull(),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.defaultNow()
			.notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp_ms" })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		uniqueIndex("user_settings_user_id_key").on(table.userId),
		foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_settings_user_id_fkey",
		})
			.onUpdate("cascade")
			.onDelete("restrict"),
	],
);

export const tagPages = sqliteTable(
	"tag_pages",
	{
		tagId: integer("tag_id").notNull(),
		pageId: integer("page_id").notNull(),
	},
	(table) => [
		index("tag_pages_pageId_idx").on(table.pageId),
		index("tag_pages_tagId_idx").on(table.tagId),
		foreignKey({
			columns: [table.pageId],
			foreignColumns: [pages.id],
			name: "tag_pages_pageId_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.tagId],
			foreignColumns: [tags.id],
			name: "tag_pages_tagId_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		primaryKey({
			columns: [table.tagId, table.pageId],
			name: "tag_pages_pkey",
		}),
	],
);

export const segmentAnnotationLinks = sqliteTable(
	"segment_annotation_links",
	{
		mainSegmentId: integer("main_segment_id").notNull(),
		annotationSegmentId: integer("annotation_segment_id").notNull(),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("segment_annotation_links_annotation_segment_id_idx").on(
			table.annotationSegmentId,
		),
		index("segment_annotation_links_main_segment_id_idx").on(
			table.mainSegmentId,
		),
		foreignKey({
			columns: [table.annotationSegmentId],
			foreignColumns: [segments.id],
			name: "segment_annotation_links_annotation_segment_id_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.mainSegmentId],
			foreignColumns: [segments.id],
			name: "segment_annotation_links_main_segment_id_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		primaryKey({
			columns: [table.mainSegmentId, table.annotationSegmentId],
			name: "segment_annotation_links_pkey",
		}),
	],
);
