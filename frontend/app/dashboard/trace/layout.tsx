import TraceList from "@/components/TraceList";

export default function TraceRoot({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex-1 min-w-0 overflow-hidden">{children}</div>
      <TraceList />
    </div>
  );
}
