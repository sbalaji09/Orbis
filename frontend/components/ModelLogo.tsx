import Image from "next/image";

interface ModelLogoProps {
  provider: string;
  size?: number;
}

export function ModelLogo({ provider, size = 24 }: ModelLogoProps) {
  const getLogoPath = () => {
    switch (provider) {
      case "xAI":
        return "/logos/grok.svg";
      case "OpenAI":
        return "/logos/openai.svg";
      case "Groq":
        return "/logos/groq.svg";
      case "Google":
        return "/logos/gemini.svg";
      case "Mistral AI":
        return "/logos/mistral.svg";
      case "Anthropic":
      case "Anthropic (Claude)":
        return "/logos/claude.svg";
      default:
        return null;
    }
  };

  const logoPath = getLogoPath();

  if (!logoPath) {
    // Fallback for unknown providers
    return (
      <div style={{ width: size, height: size }} className="flex items-center justify-center bg-black/10 rounded-sm border border-black/20">
        <span className="text-black/40 text-xs font-bold">{provider[0]}</span>
      </div>
    );
  }

  return (
    <Image
      src={logoPath}
      alt={`${provider} logo`}
      width={size}
      height={size}
      className="object-contain"
    />
  );
}
