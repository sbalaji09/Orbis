import { Suspense } from "react";
import { fetchPromptFamilies } from "@/lib/prompt-api";
import PromptVersioningClient from "./PromptVersioningClient";

export const revalidate = 10;

async function PromptVersioningContent() {
  const families = await fetchPromptFamilies();
  return <PromptVersioningClient families={families} />;
}

function LoadingSkeleton() {
  return (
    <div className="h-full flex items-center justify-center bg-[#F5F3F0]">
      <div className="text-center">
        <div className="animate-spin w-8 h-8 border-2 border-babyblue border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-sm text-black/60">Loading prompts...</p>
      </div>
    </div>
  );
}

export default function PromptVersioningPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <PromptVersioningContent />
    </Suspense>
  );
}
