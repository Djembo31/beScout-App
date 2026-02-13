export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-1/4 w-[640px] h-[640px] bg-[#FFD700]/[0.03] rounded-full blur-[140px]" />
        <div className="absolute bottom-0 left-1/4 w-[820px] h-[820px] bg-[#22C55E]/[0.035] rounded-full blur-[160px]" />
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          }}
        />
      </div>

      {/* Centered Content */}
      <div className="relative flex items-center justify-center min-h-screen px-4">
        {children}
      </div>
    </>
  );
}
