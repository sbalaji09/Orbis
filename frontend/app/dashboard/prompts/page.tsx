export default function PromptsLanding() {
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
        <div className="text-center max-w-md">
          {/* Icon */}
          <div className="w-16 h-16 mx-auto mb-6 bg-[#5B5FFF]/10 border-2 border-[#5B5FFF]/20 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-[#5B5FFF]/40"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>

          <h1 className="text-4xl font-semibold text-foreground/30">
            No prompt selected
          </h1>
          <p className="text-lg text-foreground/20 mt-3">
            Select a prompt from the sidebar to view versions and compare
          </p>
        </div>
      </div>
    </div>
  );
}