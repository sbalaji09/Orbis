import NavMenu from "@/components/NavMenu";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header bar */}
        <header className="flex items-center justify-between px-6 py-3.5 bg-card border-b border-border">
          <NavMenu />
        </header>
        {/* Content area */}
        <main className="flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
