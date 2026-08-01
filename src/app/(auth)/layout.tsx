export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="mb-8 flex items-center gap-2">
        <div className="h-8 w-8 rounded-full border-2 border-accent-strength fill-strength-soft" />
        <span className="font-display text-2xl uppercase tracking-wider text-text">
          Iron Ledger
        </span>
      </div>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
