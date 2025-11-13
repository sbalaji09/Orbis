import TraceList from "@/components/TraceList";

export default function TraceRoot({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full overflow-hidden">
      {children}
      <TraceList />
    </div>
  );
}
