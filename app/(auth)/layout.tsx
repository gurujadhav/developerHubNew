export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-navy-950 bg-grid-navy bg-grid-navy flex flex-col items-center justify-center px-4">
      {/* Ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 bg-radial-glow"
      />
      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-navy-800 border border-gold-500/40 flex items-center justify-center mb-3 shadow-gold">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                stroke="#D4A855"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h1 className="font-display font-bold text-2xl text-white tracking-tight">
            LaunchDark
          </h1>
          <p className="text-slate-500 text-sm mt-1">Deploy. Tunnel. Ship.</p>
        </div>
        {children}
      </div>
    </div>
  );
}
