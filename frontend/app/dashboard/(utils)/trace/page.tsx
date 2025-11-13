export default function TraceLanding() {
  return (
    <div
      className="w-full h-full relative overflow-hidden"
      style={{
        backgroundImage: `
          linear-gradient(to right, #0c0f0a08 1px, transparent 1px),
          linear-gradient(to bottom, #0c0f0a08 1px, transparent 1px)
        `,
        backgroundSize: "20px 20px",
        backgroundColor: "#f8f9fa",
      }}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-semibold text-foreground/30">
            No trace selected
          </h1>
          <p className="text-lg text-foreground/20 mt-3">
            Select a trace from the sidebar to view its DAG
          </p>
        </div>
      </div>
    </div>
  );
}
