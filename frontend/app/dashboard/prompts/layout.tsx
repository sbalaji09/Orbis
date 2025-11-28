export default function PromptsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex-1 min-w-0 overflow-auto">{children}</div>
    </div>
  );
}
