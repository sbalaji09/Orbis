import { Suspense } from "react";
import { fetchPromptFamilies } from "@/lib/prompt-api";
import { PromptSidebarClient } from "./PromptSidebarClient";
import { PromptSidebarSkeleton } from "./PromptSidebarSkeleton";

// Revalidate every 10 seconds
export const revalidate = 10;

async function PromptSidebarContent() {
  // Fetch prompt families on server
  const families = await fetchPromptFamilies();

  return <PromptSidebarClient families={families} />;
}

export default function PromptSidebar() {
  return (
    <Suspense fallback={<PromptSidebarSkeleton />}>
      <PromptSidebarContent />
    </Suspense>
  );
}
