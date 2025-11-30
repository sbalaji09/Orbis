export default function PromptsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-full overflow-auto bg-[#F5F3F0]">
      {children}
    </div>
  );
}
