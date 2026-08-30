export type NotificationRowsWithRelations = {
	id: number;
	actorId: string;
	actorHandle: string;
	actorName: string;
	actorImage: string;
	read: boolean;
	createdAt: Date;
	pageSlug: string;
	pageTitle: string;
	segmentTranslationText: string;
};

export type NotificationJson = Omit<
	NotificationRowsWithRelations,
	"createdAt"
> & {
	createdAt: string;
};
