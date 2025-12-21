import { NextRequest, NextResponse } from "next/server";
import { createHighlighter } from "shiki";

type SupportedLanguage = "python" | "typescript" | "curl";

const THEME = "dark-plus";

const highlighterPromise = createHighlighter({
  themes: [THEME],
  langs: ["python", "ts", "bash"],
});

function toShikiLang(language: SupportedLanguage): "python" | "ts" | "bash" {
  switch (language) {
    case "python":
      return "python";
    case "typescript":
      return "ts";
    case "curl":
      return "bash";
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      code?: string;
      language?: SupportedLanguage;
    };

    const code = body.code ?? "";
    const language = body.language;

    if (!language) {
      return NextResponse.json(
        { error: "language is required" },
        { status: 400 }
      );
    }

    if (!code.trim()) {
      return NextResponse.json({ html: "" });
    }

    if (code.length > 100_000) {
      return NextResponse.json(
        { error: "code too large" },
        { status: 413 }
      );
    }

    const highlighter = await highlighterPromise;
    const html = highlighter.codeToHtml(code, {
      lang: toShikiLang(language),
      theme: THEME,
    });

    return NextResponse.json({ html });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "failed to highlight" },
      { status: 500 }
    );
  }
}
