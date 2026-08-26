import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy — Perioxia CRM',
  description:
    'How the Perioxia CRM web and mobile apps handle your data.',
};

export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12 text-gray-800">
      <h1 className="text-3xl font-semibold text-gray-900">Privacy Policy</h1>
      <p className="mt-2 text-sm text-gray-500">Last updated: 26 August 2026</p>

      <section className="mt-8 space-y-3">
        <h2 className="text-xl font-semibold text-gray-900">Who we are</h2>
        <p>
          Perioxia CRM is a business tool sold to companies. Your company creates
          the account; you and your colleagues sign in to work leads, follow-ups,
          and invoices. This policy covers both the web app and the Perioxia CRM
          mobile app.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-xl font-semibold text-gray-900">What data we handle</h2>
        <ul className="list-disc space-y-1 pl-6">
          <li>
            <strong>Your account email</strong>, used to sign you in and identify
            you within your company.
          </li>
          <li>
            <strong>The CRM records your company already gives you access to</strong>
            {' '}— leads, follow-ups, invoices, and related notes.
          </li>
          <li>
            <strong>Your sign-in token</strong>, held on your device in the
            operating system&rsquo;s secure storage (Keychain / Keystore) so you
            stay signed in.
          </li>
        </ul>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-xl font-semibold text-gray-900">What we do not do</h2>
        <ul className="list-disc space-y-1 pl-6">
          <li>No advertising SDK and no ad identifiers.</li>
          <li>No third-party analytics SDK.</li>
          <li>No location tracking.</li>
          <li>We do not sell your data.</li>
        </ul>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-xl font-semibold text-gray-900">Sub-processors</h2>
        <p>
          We use these services only for features your company chooses to enable,
          and only on the backend — the mobile app talks only to the Perioxia API
          over HTTPS:
        </p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Razorpay — payments.</li>
          <li>Gupshup — WhatsApp messaging.</li>
          <li>Exotel — click-to-call.</li>
          <li>Google and Microsoft — optional mailbox and calendar connections you authorise.</li>
        </ul>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-xl font-semibold text-gray-900">Your rights</h2>
        <p>
          Data is encrypted in transit. Your company can enable two-factor
          authentication. To review data retention, export, or deletion, signed-in
          administrators can use{' '}
          <Link href="/settings/privacy" className="text-blue-600 underline">
            account privacy settings
          </Link>
          , in line with India&rsquo;s DPDP Act.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-xl font-semibold text-gray-900">Contact</h2>
        <p>
          Questions about this policy: <a href="mailto:privacy@perioxia.com" className="text-blue-600 underline">privacy@perioxia.com</a>.
        </p>
      </section>
    </main>
  );
}
