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
        {/* Unified header bar */}
        <div className="flex items-center justify-between px-8 py-3 bg-white/80 backdrop-blur-sm border-b border-foreground/10 shadow-sm">
          <NavMenu />
        </div>
        {/* Content area */}
        <div className="flex-1 overflow-hidden">{children}</div>
      </div>
    </div>
  );
}
