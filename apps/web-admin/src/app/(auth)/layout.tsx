export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-950 dark:text-zinc-50 relative selection:bg-zinc-200 dark:selection:bg-zinc-800 font-sans flex flex-col items-center justify-center p-6 sm:p-10">
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-size-[24px_24px] mask-[radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] z-0" />
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-zinc-300/30 dark:bg-zinc-600/10 blur-[120px] mix-blend-normal" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-zinc-300/30 dark:bg-zinc-600/10 blur-[120px] mix-blend-normal" />
      </div>

      <div className="w-full max-w-95 relative z-10 flex flex-col items-center">
        {children}
      </div>
    </div>
  );
}
