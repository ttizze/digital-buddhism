import { relations } from "drizzle-orm/relations";
import {
	accounts,
	geminiApiKeys,
	importFiles,
	importRuns,
	notifications,
	pageLocaleTranslationProofs,
	pages,
	personalAccessTokens,
	segmentAnnotationLinks,
	segmentMetadata,
	segmentMetadataTypes,
	segments,
	segmentTranslations,
	segmentTypes,
	sessions,
	translationContexts,
	translationJobs,
	translationVotes,
	userSettings,
	users,
} from "./schema";

export const accountsRelations = relations(accounts, ({ one }) => ({
	user: one(users, {
		fields: [accounts.userId],
		references: [users.id],
	}),
}));

export const usersRelations = relations(users, ({ many }) => ({
	accounts: many(accounts),
	personalAccessTokens: many(personalAccessTokens),
	geminiApiKeys: many(geminiApiKeys),
	notifications_actorId: many(notifications, {
		relationName: "notifications_actorId_users_id",
	}),
	notifications_userId: many(notifications, {
		relationName: "notifications_userId_users_id",
	}),
	translationJobs: many(translationJobs),
	segmentTranslations: many(segmentTranslations),
	sessions: many(sessions),
	translationContexts: many(translationContexts),
	translationVotes: many(translationVotes),
	pages: many(pages),
	userSettings: many(userSettings),
}));

export const importFilesRelations = relations(importFiles, ({ one }) => ({
	importRun: one(importRuns, {
		fields: [importFiles.importRunId],
		references: [importRuns.id],
	}),
}));

export const personalAccessTokensRelations = relations(
	personalAccessTokens,
	({ one }) => ({
		user: one(users, {
			fields: [personalAccessTokens.userId],
			references: [users.id],
		}),
	}),
);

export const importRunsRelations = relations(importRuns, ({ many }) => ({
	importFiles: many(importFiles),
}));

export const geminiApiKeysRelations = relations(geminiApiKeys, ({ one }) => ({
	user: one(users, {
		fields: [geminiApiKeys.userId],
		references: [users.id],
	}),
}));

export const pagesRelations = relations(pages, ({ one, many }) => ({
	translationJobs: many(translationJobs),
	pageLocaleTranslationProofs: many(pageLocaleTranslationProofs),
	segments: many(segments),
	page: one(pages, {
		fields: [pages.parentId],
		references: [pages.id],
		relationName: "pages_parentId_pages_id",
	}),
	pages: many(pages, {
		relationName: "pages_parentId_pages_id",
	}),
	user: one(users, {
		fields: [pages.userId],
		references: [users.id],
	}),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
	user_actorId: one(users, {
		fields: [notifications.actorId],
		references: [users.id],
		relationName: "notifications_actorId_users_id",
	}),
	segmentTranslation: one(segmentTranslations, {
		fields: [notifications.segmentTranslationId],
		references: [segmentTranslations.id],
	}),
	user_userId: one(users, {
		fields: [notifications.userId],
		references: [users.id],
		relationName: "notifications_userId_users_id",
	}),
}));

export const segmentTranslationsRelations = relations(
	segmentTranslations,
	({ one, many }) => ({
		notifications: many(notifications),
		segment: one(segments, {
			fields: [segmentTranslations.segmentId],
			references: [segments.id],
		}),
		user: one(users, {
			fields: [segmentTranslations.userId],
			references: [users.id],
		}),
		translationVotes: many(translationVotes),
	}),
);

export const translationJobsRelations = relations(
	translationJobs,
	({ one }) => ({
		page: one(pages, {
			fields: [translationJobs.pageId],
			references: [pages.id],
		}),
		user: one(users, {
			fields: [translationJobs.userId],
			references: [users.id],
		}),
	}),
);

export const segmentsRelations = relations(segments, ({ one, many }) => ({
	segmentTranslations: many(segmentTranslations),
	page: one(pages, {
		fields: [segments.pageId],
		references: [pages.id],
	}),
	segmentType: one(segmentTypes, {
		fields: [segments.segmentTypeId],
		references: [segmentTypes.id],
	}),
	segmentMetadata: many(segmentMetadata),
	segmentAnnotationLinks_annotationSegmentId: many(segmentAnnotationLinks, {
		relationName: "segmentAnnotationLinks_annotationSegmentId_segments_id",
	}),
	segmentAnnotationLinks_mainSegmentId: many(segmentAnnotationLinks, {
		relationName: "segmentAnnotationLinks_mainSegmentId_segments_id",
	}),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
	user: one(users, {
		fields: [sessions.userId],
		references: [users.id],
	}),
}));

export const pageLocaleTranslationProofsRelations = relations(
	pageLocaleTranslationProofs,
	({ one }) => ({
		page: one(pages, {
			fields: [pageLocaleTranslationProofs.pageId],
			references: [pages.id],
		}),
	}),
);

export const translationContextsRelations = relations(
	translationContexts,
	({ one }) => ({
		user: one(users, {
			fields: [translationContexts.userId],
			references: [users.id],
		}),
	}),
);

export const translationVotesRelations = relations(
	translationVotes,
	({ one }) => ({
		segmentTranslation: one(segmentTranslations, {
			fields: [translationVotes.translationId],
			references: [segmentTranslations.id],
		}),
		user: one(users, {
			fields: [translationVotes.userId],
			references: [users.id],
		}),
	}),
);

export const segmentTypesRelations = relations(segmentTypes, ({ many }) => ({
	segments: many(segments),
}));

export const segmentMetadataRelations = relations(
	segmentMetadata,
	({ one }) => ({
		segmentMetadataType: one(segmentMetadataTypes, {
			fields: [segmentMetadata.metadataTypeId],
			references: [segmentMetadataTypes.id],
		}),
		segment: one(segments, {
			fields: [segmentMetadata.segmentId],
			references: [segments.id],
		}),
	}),
);

export const segmentMetadataTypesRelations = relations(
	segmentMetadataTypes,
	({ many }) => ({
		segmentMetadata: many(segmentMetadata),
	}),
);

export const userSettingsRelations = relations(userSettings, ({ one }) => ({
	user: one(users, {
		fields: [userSettings.userId],
		references: [users.id],
	}),
}));

export const segmentAnnotationLinksRelations = relations(
	segmentAnnotationLinks,
	({ one }) => ({
		segment_annotationSegmentId: one(segments, {
			fields: [segmentAnnotationLinks.annotationSegmentId],
			references: [segments.id],
			relationName: "segmentAnnotationLinks_annotationSegmentId_segments_id",
		}),
		segment_mainSegmentId: one(segments, {
			fields: [segmentAnnotationLinks.mainSegmentId],
			references: [segments.id],
			relationName: "segmentAnnotationLinks_mainSegmentId_segments_id",
		}),
	}),
);
