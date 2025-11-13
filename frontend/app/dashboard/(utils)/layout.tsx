import NavMenu from "@/components/NavMenu";
import TraceList from "@/components/TraceList";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Main content area with nav */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-6 bg-background border-b border-foreground/10">
          <NavMenu />
        </div>
        <div className="flex-1 overflow-hidden">{children}</div>
      </div>

      {/* Right sidebar with trace list */}
      <TraceList />
    </div>
  );
}
