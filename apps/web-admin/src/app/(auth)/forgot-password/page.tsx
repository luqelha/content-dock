import Link from "next/link";
export default function ForgotPasswordPage() {
  return (
    <section className="space-y-4 rounded-lg border bg-card p-8">
      <h1 className="text-2xl font-semibold">Account recovery</h1>
      <p className="text-sm text-muted-foreground">
        Email recovery is not configured for this installation. Contact your
        platform operator for help restoring access.
      </p>
      <Link
        href="/login"
        className="inline-block text-sm font-medium underline"
      >
        Back to sign in
      </Link>
    </section>
  );
}
