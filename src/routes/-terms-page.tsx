import { Link, useParams } from "@tanstack/react-router";
import { LegalPage, type LegalSection } from "./-legal-page";

export default function TermsPage() {
	const { locale } = useParams({ from: "/$locale/terms" });

	const sections: LegalSection[] = [
		{
			body: (
				<>
					<p>
						These Terms of Service (“Terms”) govern your access to and use of
						Tipiṭaka (the “Service”). By clicking “I agree” or using the
						Service, you accept these Terms and our{" "}
						<Link
							className="text-blue-600"
							params={{ locale }}
							to="/$locale/privacy"
						>
							Privacy Policy
						</Link>
						.
					</p>
					<p className="text-sm">
						Last updated:
						<time dateTime="2025-07-31">31 July 2025</time>
					</p>
				</>
			),
		},
		{
			heading: "1. Definitions",
			body: (
				<ul className="list-disc pl-6">
					<li>
						<b>“User Content”</b>: articles, translations, comments, images, and
						any material you submit.
					</li>
					<li>
						<b>“Translation”</b>: text that renders a source work into another
						language, whether AI-assisted or human-authored.
					</li>
					<li>
						<b>“We/Us”</b>: REIMEI LLC.
					</li>
				</ul>
			),
		},
		{
			heading: "2. Service Description",
			body: (
				<p>
					The Service is a platform where users may publish articles and upload
					or refine translations. AI may provide draft translations for human
					post-editing.
				</p>
			),
		},
		{
			heading: "3. User Responsibilities",
			body: (
				<ul className="list-disc pl-6">
					<li>Comply with all applicable laws and regulations.</li>
					<li>
						Ensure you hold necessary rights or licences for source texts.
					</li>
					<li>
						Refrain from infringing intellectual-property, privacy, or other
						rights.
					</li>
					<li>No unlawful, harassing, or hateful content.</li>
					<li>
						Safeguard login credentials; you are responsible for activity on
						your account.
					</li>
				</ul>
			),
		},
		{
			heading: "4. Licence of User Content",
			body: (
				<>
					<p className="mb-4">
						By submitting User Content you grant REIMEI LLC a worldwide,
						royalty-free, sublicensable licence to host, reproduce, distribute,
						publicly display, and create derivative works for the purpose of
						operating and improving the Service.
					</p>
					<p className="mb-4">
						<b>Translations of Public-Domain source texts</b> are released by
						you into the public domain (CC0 1.0). If the source text is subject
						to copyright, your translation is licensed under{" "}
						<a
							className="text-blue-600"
							href="https://creativecommons.org/licenses/by-sa/4.0/"
							rel="noreferrer"
							target="_blank"
						>
							CC BY-SA 4.0
						</a>
						.
					</p>
				</>
			),
		},
		{
			heading: "5. Copyright Infringement (DMCA)",
			body: (
				<p>
					If you believe content infringes your copyright, send a written notice
					containing the information required by 17 U.S.C. § 512 to REIMEI LLC
					at contact@reimei.dev. We will respond and, where appropriate, remove
					or disable access to the material.
				</p>
			),
		},
		{
			heading: "6. Disclaimer",
			body: (
				<p>
					The Service is provided “as is” without warranty of any kind. We
					disclaim all implied warranties, including merchantability, fitness
					for a particular purpose, and non-infringement.
				</p>
			),
		},
		{
			heading: "7. Limitation of Liability",
			body: (
				<p>
					To the maximum extent permitted by law, REIMEI LLC's aggregate
					liability arising out of or relating to the Service shall not exceed
					the greater of (a) JPY 10,000 or (b) the amount you paid us in the
					prior 12 months.
				</p>
			),
		},
		{
			heading: "8. Force Majeure",
			body: (
				<p>
					We are not liable for failure to perform due to causes beyond our
					reasonable control, including natural disasters, internet outages, or
					governmental actions.
				</p>
			),
		},
		{
			heading: "9. EU Digital Services Act Notice",
			body: (
				<p>
					EU users may appeal content-moderation decisions or submit
					illegal-content notices to REIMEI LLC at contact@reimei.dev. Include{" "}
					<code>[DSA Appeal]</code> or
					<code>[Illegal Content]</code> in the subject. We publish an annual
					transparency report in accordance with Regulation (EU) 2022/2065.
				</p>
			),
		},
		{
			heading: "10. Governing Law & Jurisdiction",
			body: (
				<p>
					These Terms are governed by Japanese law. The Tokyo District Court has
					exclusive jurisdiction for disputes arising out of or relating to the
					Service.
				</p>
			),
		},
		{
			heading: "11. Changes to These Terms",
			body: (
				<p>
					We may revise these Terms. We will notify you at least 30 days in
					advance by email and in-app banner. Continued use after the effective
					date constitutes acceptance of the revised Terms.
				</p>
			),
		},
		{
			heading: "12. Contact",
			body: (
				<p>
					Questions about these Terms may be sent to REIMEI LLC at
					contact@reimei.dev.
				</p>
			),
		},
	];

	return (
		<LegalPage locale={locale} sections={sections} title="Terms of Service" />
	);
}
