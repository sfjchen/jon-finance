export const metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16 space-y-4 text-sm leading-6 [&_h1]:text-xl [&_h1]:font-semibold">
      <h1>Privacy</h1>
      <p>
        jon-finance is a single-user, personal application operated by its owner for their own use. It connects to the owner&apos;s own
        financial accounts through Plaid in read-only mode to display balances, transactions, and holdings. It cannot move money.
      </p>
      <p>
        Data is stored in a private Supabase project controlled by the owner and is not shared with, sold to, or accessible by anyone else.
        Merchant names and amounts may be sent to an AI model to assign spending categories; account numbers and personal identifiers are never sent.
      </p>
      <p>
        Access to the application is restricted to one allow-listed email address. Plaid access tokens are stored encrypted at rest and are never exposed to the browser.
      </p>
      <p>Questions: the owner, via the GitHub repository sfjchen/jon-finance.</p>
    </main>
  );
}
