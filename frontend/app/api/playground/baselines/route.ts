import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type BaselineRow = {
  id: string;
  name: string;
  prompt: string;
  outputs: unknown;
  created_at: string;
  updated_at: string;
};

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
      .from("playground_baselines")
      .select("id,name,prompt,outputs,created_at,updated_at")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const baselines = ((data as BaselineRow[]) ?? []).map((b) => ({
      id: b.id,
      name: b.name,
      prompt: b.prompt,
      outputs: b.outputs,
      createdAt: b.created_at,
      updatedAt: b.updated_at,
    }));

    return NextResponse.json({ baselines });
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
      id?: string;
      name?: string;
      prompt?: string;
      outputs?: unknown;
    };

    const id = (body.id ?? "").trim();
    const name = (body.name ?? "").trim();
    const prompt = (body.prompt ?? "").toString();
    const outputs = body.outputs;

    if (!id)
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    if (!name)
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    if (!prompt.trim()) {
      return NextResponse.json({ error: "prompt is required" }, { status: 400 });
    }
    if (outputs == null) {
      return NextResponse.json(
        { error: "outputs is required" },
        { status: 400 }
      );
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
      .from("playground_baselines")
      .upsert(
        { user_id: user.id, id, name, prompt, outputs },
        { onConflict: "user_id,id" }
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
    const body = (await request.json()) as { id?: string };
    const id = (body.id ?? "").trim();
    if (!id)
      return NextResponse.json({ error: "id is required" }, { status: 400 });

    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { error } = await supabase
      .from("playground_baselines")
      .delete()
      .eq("user_id", user.id)
      .eq("id", id);

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

