import enMessages from "../../../messages/en.json";
import esMessages from "../../../messages/es.json";
import jaMessages from "../../../messages/ja.json";
import koMessages from "../../../messages/ko.json";
import zhMessages from "../../../messages/zh.json";

export function getMessages(locale: string): typeof enMessages {
	switch (locale) {
		case "es":
			return esMessages;
		case "ja":
			return jaMessages;
		case "ko":
			return koMessages;
		case "zh":
			return zhMessages;
		default:
			return enMessages;
	}
}
