import { fetchPromptFamilies } from "@/lib/prompt-api";
import { PromptSidebarClient } from "./PromptSidebarClient";

// Revalidate every 10 seconds
export const revalidate = 10;

export default async function PromptSidebar() {
  // Fetch prompt families on server
  const families = await fetchPromptFamilies();

  return <PromptSidebarClient families={families} />;
}
