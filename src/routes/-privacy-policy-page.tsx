import { useParams } from "@tanstack/react-router";
import { LegalPage, type LegalSection } from "./-legal-page";

const PRIVACY_SECTIONS: LegalSection[] = [
	{
		body: (
			<>
				<p className="mb-4">
					This Privacy Policy explains how <b>REIMEI LLC</b> (“REIMEI”, “we”,
					“our”, or “us”) collects, uses, discloses, and safeguards Personal
					Data when you use our services (the “Service”).
				</p>
				<p className="text-sm">
					Last updated: <time dateTime="2025-07-31">31 July 2025</time>
				</p>
			</>
		),
	},
	{
		heading: "Controller Details",
		body: (
			<p>
				<b>REIMEI LLC</b>
				<br />
				Managing Member: Takate Tomoki
				<br />
				Privacy and data-protection requests may be sent to{" "}
				<a className="text-blue-600" href="mailto:contact@reimei.dev">
					contact@reimei.dev
				</a>
				. The controller's address will be provided without delay upon request.
			</p>
		),
	},
	{
		heading: "1. Information We Collect & How",
		body: (
			<>
				<p className="mb-4">
					We collect Personal Data you provide directly and data generated
					automatically when you interact with the Service:
				</p>
				<ul className="list-disc pl-6">
					<li>Account data (handle, email address, display name)</li>
					<li>
						Content you post (articles, translations, comments, votes,
						attachments)
					</li>
					<li>Usage logs (pages visited, actions taken, timestamps)</li>
					<li>
						Device & connection info (IP address, browser type, OS, referrer)
					</li>
					<li>Cookies & similar technologies (please see “Cookies” below)</li>
				</ul>
			</>
		),
	},
	{
		heading: "2. Legal Bases & Purposes",
		body: (
			<>
				<p className="mb-4">
					We process Personal Data under the following legal bases:
				</p>
				<ul className="list-disc pl-6 mb-4">
					<li>Performance of a contract (provision of the Service)</li>
					<li>Legitimate interests (service improvement, security)</li>
					<li>Consent (optional marketing emails, analytics cookies)</li>
					<li>Compliance with legal obligations</li>
				</ul>
				<p className="mb-4">Key purposes include to:</p>
				<ul className="list-disc pl-6">
					<li>Provide, maintain, and improve the Service</li>
					<li>Communicate with you regarding your account or feedback</li>
					<li>Analyze usage patterns to optimize user experience</li>
					<li>Detect, prevent, and investigate fraud or abuse</li>
				</ul>
			</>
		),
	},
	{
		heading: "3. Retention Period",
		body: (
			<p>
				We retain Personal Data for as long as your account is active and for
				six (6) months after deletion unless longer retention is required by law
				(e.g. tax records) or our legitimate interests (e.g. security logs).
			</p>
		),
	},
	{
		heading: "4. International Transfers",
		body: (
			<p>
				Your data may be processed on servers located outside Japan and the EU /
				EEA (e.g. AWS us-east-1). When we transfer Personal Data
				internationally, we rely on Standard Contractual Clauses or adequacy
				decisions to ensure an equivalent level of protection.
			</p>
		),
	},
	{
		heading: "5. Sharing and Disclosure",
		body: (
			<>
				<p className="mb-4">
					We share Personal Data only in the following circumstances:
				</p>
				<ul className="list-disc pl-6">
					<li>With your explicit consent</li>
					<li>With service providers under confidentiality agreements</li>
					<li>To comply with legal or regulatory obligations</li>
					<li>
						To protect the rights, property, or safety of REIMEI LLC or others
					</li>
					<li>In connection with corporate restructuring (e.g. merger)</li>
				</ul>
			</>
		),
	},
	{
		heading: "6. Cookies",
		body: (
			<p className="mb-4">
				We use essential cookies for authentication and session management, and
				optional analytics cookies to understand feature usage. You can manage
				cookie preferences in your browser or via our in-app cookie banner.
			</p>
		),
	},
	{
		heading: "7. Your Rights",
		body: (
			<p className="mb-4">
				Subject to applicable law, you have the right to access, correct,
				delete, restrict, or object to the processing of your Personal Data, and
				to receive a portable copy. Requests may be sent to contact@reimei.dev.
				You may also lodge a complaint with the Personal Information Protection
				Commission (Japan) or your local supervisory authority.
			</p>
		),
	},
	{
		heading: "8. Children’s Privacy",
		body: (
			<p>
				The Service is not directed to children under 13. We do not knowingly
				collect Personal Data from children. If we learn that a child has
				provided us Personal Data, we will delete it promptly.
			</p>
		),
	},
	{
		heading: "9. Changes to This Policy",
		body: (
			<p>
				We may amend this Policy. We will notify you at least 30 days in advance
				via in-app banner or email, and seek renewed consent where required.
			</p>
		),
	},
	{
		heading: "10. Contact",
		body: <p>Questions about this Policy may be sent to contact@reimei.dev.</p>,
	},
];

export default function PrivacyPolicyPage() {
	const { locale } = useParams({ from: "/$locale/privacy" });

	return (
		<LegalPage
			locale={locale}
			sections={PRIVACY_SECTIONS}
			title="Privacy Policy"
		/>
	);
}
