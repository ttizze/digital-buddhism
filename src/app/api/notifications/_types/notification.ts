export type NotificationRowsWithRelations = {
	id: number;
	actorId: string;
	actorHandle: string;
	actorName: string;
	actorImage: string;
	read: boolean;
	createdAt: Date;
	pageSlug: string;
	pageOwnerHandle: string;
	pageTitle: string;
	segmentTranslationText: string;
};
