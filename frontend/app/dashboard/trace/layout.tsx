import TraceList from "@/components/TraceList";

export default function TraceRoot({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {children}
      <TraceList />
    </div>
  );
}
