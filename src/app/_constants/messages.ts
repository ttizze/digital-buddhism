import enMessages from "../../../messages/en.json";
import esMessages from "../../../messages/es.json";
import jaMessages from "../../../messages/ja.json";
import koMessages from "../../../messages/ko.json";
import zhMessages from "../../../messages/zh.json";
import { DEFAULT_MESSAGE_LOCALE, type MessageLocale } from "./message-locales";

const messages: Record<MessageLocale, typeof enMessages> = {
	en: enMessages,
	es: esMessages,
	ja: jaMessages,
	ko: koMessages,
	zh: zhMessages,
};

export function getMessages(locale: string): typeof enMessages {
	const messageLocale = Object.hasOwn(messages, locale)
		? (locale as MessageLocale)
		: DEFAULT_MESSAGE_LOCALE;
	return messages[messageLocale];
}
