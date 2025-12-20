import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  ProviderKeyProvider,
  PROVIDERS,
} from "@/lib/provider-keys";
import { decryptProviderKey, encryptProviderKey } from "@/lib/provider-keys.server";

type ProviderKeyRow = {
  provider: ProviderKeyProvider;
  encrypted_key: string;
  updated_at: string;
};

const PROVIDER_ENV: Record<ProviderKeyProvider, string> = {
  openai: "OPENAI_API_KEY",
  xai: "XAI_API_KEY",
  groq: "GROQ_API_KEY",
  mistral: "MISTRAL_API_KEY",
  deepseek: "DEEPSEEK_API_KEY",
  gemini: "GEMINI_API_KEY",
};

function hasServerKey(envVar: string) {
  return Boolean(process.env[envVar] || process.env[`ORBIS_DEMO_${envVar}`]);
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("provider_api_keys")
      .select("provider, encrypted_key, updated_at");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = (data as ProviderKeyRow[]) ?? [];
    const byProvider = new Map(rows.map((r) => [r.provider, r]));

    return NextResponse.json({
      providers: PROVIDERS.map((p) => ({
        provider: p.id,
        label: p.label,
        connected: byProvider.has(p.id),
        available: byProvider.has(p.id) || hasServerKey(PROVIDER_ENV[p.id]),
        updatedAt: byProvider.get(p.id)?.updated_at ?? null,
      })),
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      provider?: ProviderKeyProvider;
      apiKey?: string;
    };

    const provider = body.provider;
    const apiKey = (body.apiKey ?? "").trim();

    if (!provider || !PROVIDERS.some((p) => p.id === provider)) {
      return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
    }
    if (!apiKey) {
      return NextResponse.json({ error: "API key is required" }, { status: 400 });
    }

    // Ensure encryption is configured (also validates length/format)
    const encrypted = encryptProviderKey(apiKey);
    // sanity: decrypt round-trip
    decryptProviderKey(encrypted);

    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { error } = await supabase.from("provider_api_keys").upsert(
      {
        user_id: user.id,
        provider,
        encrypted_key: encrypted,
      },
      { onConflict: "user_id,provider" }
    );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = (await request.json()) as { provider?: ProviderKeyProvider };
    const provider = body.provider;
    if (!provider || !PROVIDERS.some((p) => p.id === provider)) {
      return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { error } = await supabase
      .from("provider_api_keys")
      .delete()
      .eq("user_id", user.id)
      .eq("provider", provider);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
