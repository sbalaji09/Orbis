import NavMenu from "@/components/NavMenu";
import TraceList from "@/components/TraceList";

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
          <div className="flex items-center gap-3">
            <span className="text-xs text-foreground/40 font-medium uppercase tracking-wider">
              Trace Visualization
            </span>
          </div>
        </div>
        {/* Content area */}
        <div className="flex-1 overflow-hidden">{children}</div>
      </div>

      {/* Right sidebar with trace list */}
      <TraceList />
    </div>
  );
}
