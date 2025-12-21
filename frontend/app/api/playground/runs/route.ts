import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RunRow = {
  id: string;
  name: string;
  prompt: string;
  outputs: unknown;
  created_at: string;
  updated_at: string;
};

export async function GET(request: NextRequest) {
  try {
    const limit = Math.min(
      50,
      Math.max(1, Number(request.nextUrl.searchParams.get("limit") ?? 10) || 10)
    );

    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("playground_runs")
      .select("id,name,prompt,outputs,created_at,updated_at")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const runs = ((data as RunRow[]) ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      prompt: r.prompt,
      outputs: r.outputs,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));

    return NextResponse.json({ runs });
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
      .from("playground_runs")
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
    const all = request.nextUrl.searchParams.get("all") === "1";
    const body = all ? null : ((await request.json()) as { id?: string });
    const id = all ? "" : (body?.id ?? "").trim();

    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    let query = supabase.from("playground_runs").delete().eq("user_id", user.id);
    if (!all) {
      if (!id)
        return NextResponse.json({ error: "id is required" }, { status: 400 });
      query = query.eq("id", id);
    }

    const { error } = await query;
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

