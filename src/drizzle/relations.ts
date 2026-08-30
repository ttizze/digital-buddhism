import { relations } from "drizzle-orm/relations";
import {
	accounts,
	geminiApiKeys,
	importFiles,
	importRuns,
	notifications,
	pageLocaleTranslationProofs,
	segmentAnnotationLinks,
	segmentMetadata,
	segmentMetadataTypes,
	segments,
	segmentTranslations,
	segmentTypes,
	selectedSegmentTranslations,
	sessions,
	tipitakaPages,
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
	geminiApiKeys: many(geminiApiKeys),
	notificationsAsActor: many(notifications, {
		relationName: "notifications_actorId_users_id",
	}),
	notificationsAsRecipient: many(notifications, {
		relationName: "notifications_userId_users_id",
	}),
	segmentTranslations: many(segmentTranslations),
	selectedSegmentTranslations: many(selectedSegmentTranslations),
	sessions: many(sessions),
	translationJobs: many(translationJobs),
	translationVotes: many(translationVotes),
	userSettings: many(userSettings),
}));

export const importFilesRelations = relations(importFiles, ({ one }) => ({
	importRun: one(importRuns, {
		fields: [importFiles.importRunId],
		references: [importRuns.id],
	}),
}));

export const importRunsRelations = relations(importRuns, ({ many }) => ({
	importFiles: many(importFiles),
}));

export const geminiApiKeysRelations = relations(geminiApiKeys, ({ one }) => ({
	user: one(users, {
		fields: [geminiApiKeys.userId],
		references: [users.id],
	}),
}));

export const tipitakaPagesRelations = relations(
	tipitakaPages,
	({ one, many }) => ({
		parent: one(tipitakaPages, {
			fields: [tipitakaPages.parentId],
			references: [tipitakaPages.id],
			relationName: "tipitaka_pages_parent_id",
		}),
		children: many(tipitakaPages, {
			relationName: "tipitaka_pages_parent_id",
		}),
		segments: many(segments),
		translationJobs: many(translationJobs),
		translationProofs: many(pageLocaleTranslationProofs),
	}),
);

export const notificationsRelations = relations(notifications, ({ one }) => ({
	actor: one(users, {
		fields: [notifications.actorId],
		references: [users.id],
		relationName: "notifications_actorId_users_id",
	}),
	recipient: one(users, {
		fields: [notifications.userId],
		references: [users.id],
		relationName: "notifications_userId_users_id",
	}),
	segmentTranslation: one(segmentTranslations, {
		fields: [notifications.segmentTranslationId],
		references: [segmentTranslations.id],
	}),
}));

export const segmentTranslationsRelations = relations(
	segmentTranslations,
	({ one, many }) => ({
		segment: one(segments, {
			fields: [segmentTranslations.segmentId],
			references: [segments.id],
		}),
		user: one(users, {
			fields: [segmentTranslations.userId],
			references: [users.id],
		}),
		notifications: many(notifications),
		translationVotes: many(translationVotes),
	}),
);
export const segmentTypesRelations = relations(segmentTypes, ({ many }) => ({
	segments: many(segments),
}));

export const selectedSegmentTranslationsRelations = relations(
	selectedSegmentTranslations,
	({ one }) => ({
		translation: one(segmentTranslations, {
			fields: [
				selectedSegmentTranslations.translationId,
				selectedSegmentTranslations.segmentId,
				selectedSegmentTranslations.locale,
			],
			references: [
				segmentTranslations.id,
				segmentTranslations.segmentId,
				segmentTranslations.locale,
			],
		}),
		selectedBy: one(users, {
			fields: [selectedSegmentTranslations.selectedByUserId],
			references: [users.id],
		}),
	}),
);

export const translationJobsRelations = relations(
	translationJobs,
	({ one }) => ({
		page: one(tipitakaPages, {
			fields: [translationJobs.pageId],
			references: [tipitakaPages.id],
		}),
		user: one(users, {
			fields: [translationJobs.userId],
			references: [users.id],
		}),
	}),
);

export const segmentsRelations = relations(segments, ({ one, many }) => ({
	page: one(tipitakaPages, {
		fields: [segments.pageId],
		references: [tipitakaPages.id],
	}),
	segmentType: one(segmentTypes, {
		fields: [segments.segmentTypeId],
		references: [segmentTypes.id],
	}),
	segmentTranslations: many(segmentTranslations),
	segmentMetadata: many(segmentMetadata),
	annotationLinks: many(segmentAnnotationLinks, {
		relationName: "segmentAnnotationLinks_annotationSegmentId_segments_id",
	}),
	mainLinks: many(segmentAnnotationLinks, {
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
		page: one(tipitakaPages, {
			fields: [pageLocaleTranslationProofs.pageId],
			references: [tipitakaPages.id],
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
		annotationSegment: one(segments, {
			fields: [segmentAnnotationLinks.annotationSegmentId],
			references: [segments.id],
			relationName: "segmentAnnotationLinks_annotationSegmentId_segments_id",
		}),
		mainSegment: one(segments, {
			fields: [segmentAnnotationLinks.mainSegmentId],
			references: [segments.id],
			relationName: "segmentAnnotationLinks_mainSegmentId_segments_id",
		}),
	}),
);
