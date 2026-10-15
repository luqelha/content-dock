export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-foreground sm:p-10">
      <div className="flex w-full max-w-95 flex-col items-center">
        {children}
      </div>
    </main>
  );
}
