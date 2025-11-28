import PromptDetailClient from "./PromptDetailClient";

// Revalidate every 10 seconds
export const revalidate = 10;

export default async function PromptDetailPage({
  params,
}: {
  params: Promise<{ promptName: string }>;
}) {
  const resolvedParams = await params;
  const promptName = decodeURIComponent(resolvedParams.promptName);

  return <PromptDetailClient promptName={promptName} />;
}
