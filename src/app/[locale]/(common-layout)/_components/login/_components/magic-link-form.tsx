import { CheckCircle, Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { useTranslations } from "use-intl";
import * as v from "valibot";
import { authClient } from "@/app/[locale]/_service/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function MagicLinkForm({ redirectTo }: { redirectTo: string }) {
	const t = useTranslations("MagicLinkForm");
	const [email, setEmail] = useState("");
	const [sent, setSent] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();

		const schema = v.object({
			email: v.pipe(v.string(), v.email(t("invalidEmail"))),
		});
		const result = v.safeParse(schema, { email });
		if (!result.success) {
			setError(
				v.flatten(result.issues).nested?.email?.[0] ?? t("invalidEmail"),
			);
			return;
		}

		startTransition(() =>
			authClient.signIn
				.magicLink({
					email: result.output.email,
					callbackURL: redirectTo,
				})
				.then(() => setSent(true))
				.catch((e) => {
					setError(t("sendFailed"));
					throw e;
				}),
		);
	}

	if (sent) {
		return (
			<div className="text-center space-y-3">
				<div className="flex items-center justify-center gap-2">
					<CheckCircle className="h-5 w-5 text-green-600" />
					<p className="font-medium">{t("sent")}</p>
				</div>
				<p className="text-sm text-muted-foreground">{t("checkInbox")}</p>
			</div>
		);
	}

	return (
		<form className="space-y-4" onSubmit={handleSubmit}>
			<div className="space-y-2">
				<Label htmlFor="email">{t("email")}</Label>
				<Input
					autoComplete="email"
					id="email"
					name="email"
					onChange={(e) => setEmail(e.target.value)}
					required
					type="email"
					value={email}
				/>
				{error && <p className="text-sm text-destructive">{error}</p>}
			</div>

			<Button
				className="w-full rounded-full"
				disabled={isPending}
				type="submit"
			>
				{isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : t("send")}
			</Button>
		</form>
	);
}
