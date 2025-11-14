import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-8">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg border-2 border-foreground p-8 text-center">
        <div className="mb-6">
          <h1 className="text-6xl font-bold text-red-500 mb-2">404</h1>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Trace Not Found
          </h2>
          <p className="text-foreground/70">
            The trace ID you&apos;re looking for doesn&apos;t exist in our
            system.
          </p>
        </div>

        <div className="mb-6"></div>

        <Link
          href="/dashboard"
          className="inline-block px-6 py-3 bg-foreground text-background rounded-lg 
            font-semibold hover:bg-foreground/90 transition-colors duration-200"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
