import NavMenu from "@/components/NavMenu";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-[#F5F3F0]">
      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header bar */}
        <header className="flex items-center justify-between px-6 py-3.5 bg-[#F5F3F0]/80 backdrop-blur-sm border-b border-black/10">
          <NavMenu />
        </header>
        {/* Content area */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
