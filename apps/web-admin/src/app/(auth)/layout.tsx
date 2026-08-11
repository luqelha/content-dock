export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-6 sm:p-10 font-sans">
      <div className="w-full max-w-100">{children}</div>
    </div>
  );
}
