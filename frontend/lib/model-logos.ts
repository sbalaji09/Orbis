export type ModelLogo = {
  src: string;
  alt: string;
  color: string;
};

const PROVIDER_LOGOS: Array<{ match: RegExp; logo: ModelLogo }> = [
  {
    match: /(gpt|openai|o1|o3)/i,
    // logo is black; use a dark neutral so the bar still reads with a black stroke
    logo: { src: "/logos/openai.svg", alt: "OpenAI", color: "#111827" },
  },
  {
    match: /claude/i,
    logo: { src: "/logos/claude.svg", alt: "Anthropic", color: "#ff6b00" },
  },
  {
    match: /gemini/i,
    logo: { src: "/logos/gemini.svg", alt: "Google", color: "#06b6d4" },
  },
  {
    match: /(llama|meta)/i,
    logo: { src: "/logos/meta.svg", alt: "Meta", color: "#0082fb" },
  },
  {
    match: /mistral/i,
    logo: { src: "/logos/mistral.svg", alt: "Mistral", color: "#ff7b54" },
  },
  {
    match: /deepseek/i,
    logo: { src: "/logos/deepseek.svg", alt: "DeepSeek", color: "#111827" },
  },
  { match: /grok/i, logo: { src: "/logos/grok.svg", alt: "xAI", color: "#e91e8c" } },
  { match: /groq/i, logo: { src: "/logos/groq.svg", alt: "Groq", color: "#e8c302" } },
];

export function getModelLogo(modelName: string): ModelLogo | null {
  for (const { match, logo } of PROVIDER_LOGOS) {
    if (match.test(modelName)) return logo;
  }
  return null;
}

function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const h = hex.replace("#", "").trim();
  if (h.length !== 6) return null;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  if ([r, g, b].some((v) => Number.isNaN(v))) return null;
  return { r, g, b };
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (v: number) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  const d = max - min;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case r:
        h = ((g - b) / d) % 6;
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
    }
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s, l };
}

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let rp = 0, gp = 0, bp = 0;
  if (h < 60) [rp, gp, bp] = [c, x, 0];
  else if (h < 120) [rp, gp, bp] = [x, c, 0];
  else if (h < 180) [rp, gp, bp] = [0, c, x];
  else if (h < 240) [rp, gp, bp] = [0, x, c];
  else if (h < 300) [rp, gp, bp] = [x, 0, c];
  else [rp, gp, bp] = [c, 0, x];
  return { r: (rp + m) * 255, g: (gp + m) * 255, b: (bp + m) * 255 };
}

export function getModelThemeColor(modelName: string): string {
  return getModelLogo(modelName)?.color ?? "#5b5fff";
}

// Keeps the provider’s “brand” color but nudges hue/lightness so multiple models don’t look identical.
export function getModelColorVariant(modelName: string): string {
  const base = getModelThemeColor(modelName);
  const rgb = hexToRgb(base);
  if (!rgb) return base;
  const { h, s, l } = rgbToHsl(rgb.r, rgb.g, rgb.b);
  const seed = hashString(modelName);
  const hueJitter = ((seed % 31) - 15) * 1.2; // ~[-18, +18] degrees
  const lightJitter = ((seed >> 8) % 17) - 8; // [-8, +8]
  const satJitter = ((seed >> 16) % 13) - 6; // [-6, +6]
  const h2 = (h + hueJitter + 360) % 360;
  const s2 = clamp(s + satJitter / 100, 0.35, 0.9);
  const l2 = clamp(l + lightJitter / 100, 0.35, 0.65);
  const out = hslToRgb(h2, s2, l2);
  return rgbToHex(out.r, out.g, out.b);
}
