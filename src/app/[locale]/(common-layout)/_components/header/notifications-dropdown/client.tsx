"use client";

import { Link } from "@tanstack/react-router";
import { Bell, Loader2 } from "lucide-react";
import useSWR from "swr";
import type { NotificationRowsWithRelations } from "@/app/api/notifications/_types/notification";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function NotificationsDropdownClient({ locale }: { locale: string }) {
	const { data, isLoading, mutate } = useSWR<{
		notifications: NotificationRowsWithRelations[];
	}>(
		"/api/notifications",
		(url) => fetch(url, { credentials: "include" }).then((r) => r.json()),
		{ revalidateOnFocus: true },
	);

	if (isLoading) return <Loader2 className="w-6 h-6 animate-spin" />;

	const handleClick = (open: boolean) => {
		if (!open) return;
		void fetch("/api/notifications", {
			method: "POST",
			credentials: "include",
		}).then((response) => {
			if (response.status === 401) {
				window.location.assign(`/${locale}/auth/login`);
			}
		});
		mutate(
			(prev) => {
				if (!prev) return prev;
				return {
					notifications: prev.notifications.map((n) => ({
						...n,
						read: true,
					})),
				};
			},
			{ revalidate: false },
		);
	};
	const unreadCount =
		data?.notifications?.filter((notification) => !notification.read).length ??
		0;

	return (
		<DropdownMenu
			data-testid="notifications-menu"
			modal={false}
			onOpenChange={handleClick}
		>
			<DropdownMenuTrigger asChild>
				<div className="relative">
					<Bell className="w-6 h-6 cursor-pointer" data-testid="bell-icon" />
					{unreadCount ? (
						<span
							className="absolute top-0 right-0 translate-x-1/2 -translate-y-1/2 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center"
							data-testid="unread-count"
						>
							{unreadCount}
						</span>
					) : null}
				</div>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				className="w-80 overflow-y-scroll h-96 p-0 rounded-xl"
				data-testid="notifications-menu-content"
			>
				{!data?.notifications || data.notifications.length === 0 ? (
					<DropdownMenuItem className="cursor-default">
						No notifications
					</DropdownMenuItem>
				) : (
					data.notifications.map((notification, index) => (
						<NotificationItem
							index={index}
							key={notification.id}
							locale={locale}
							notificationRowsWithRelations={notification}
						/>
					))
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function NotificationItem({
	notificationRowsWithRelations,
	locale,
	index,
}: {
	notificationRowsWithRelations: NotificationRowsWithRelations;
	locale: string;
	index: number;
}) {
	return (
		<DropdownMenuItem
			className={`flex items-center p-4 border-t rounded-none ${
				!notificationRowsWithRelations.read ? "bg-muted" : ""
			} ${index === 0 ? "border-none" : ""}`}
		>
			<NotificationContent
				locale={locale}
				notificationRowsWithRelations={notificationRowsWithRelations}
			/>
		</DropdownMenuItem>
	);
}

function NotificationContent({
	notificationRowsWithRelations,
	locale,
}: {
	notificationRowsWithRelations: NotificationRowsWithRelations;
	locale: string;
}) {
	const {
		actorHandle,
		actorImage,
		actorName,
		pageSlug,
		pageTitle,
		segmentTranslationText,
	} = notificationRowsWithRelations;

	return (
		<>
			<NotificationAvatar
				actorHandle={actorHandle}
				actorImage={actorImage}
				actorName={actorName}
				locale={locale}
			/>
			<span className="flex flex-col">
				<span>
					<Link
						className="hover:underline font-bold"
						params={{ handle: actorHandle, locale }}
						to="/$locale/$handle"
					>
						{actorName}
					</Link>
					<span className="text-gray-500"> voted for </span>
					<span>{segmentTranslationText}</span>
					<span className="text-gray-500"> on </span>
					<Link
						className="hover:underline font-bold"
						params={{ locale, pageSlug }}
						to="/$locale/tipitaka/$pageSlug"
					>
						{pageTitle}
					</Link>
				</span>
				<span className="text-gray-500 text-sm">
					{notificationRowsWithRelations.createdAt.toLocaleString()}
				</span>
			</span>
		</>
	);
}

function NotificationAvatar({
	actorHandle,
	actorImage,
	actorName,
	locale,
}: {
	actorHandle: string;
	actorImage: string;
	actorName: string;
	locale: string;
}) {
	return (
		<Link
			className="flex items-center mr-2 no-underline! hover:text-gray-700"
			params={{ handle: actorHandle, locale }}
			to="/$locale/$handle"
		>
			<Avatar className="w-10 h-10 shrink-0 mr-3">
				<AvatarImage
					alt={actorName || ""}
					height={40}
					src={actorImage || ""}
					width={40}
				/>
				<AvatarFallback>
					{(actorName || actorHandle).charAt(0).toUpperCase()}
				</AvatarFallback>
			</Avatar>
		</Link>
	);
}
