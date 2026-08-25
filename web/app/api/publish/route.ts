import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { dispatchPipeline } from "@/lib/github";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const token = process.env.GH_DISPATCH_TOKEN;
  if (!token) return NextResponse.json({ error: "not configured" }, { status: 500 });

  const gh = await dispatchPipeline(token);
  if (gh.status !== 204) {
    return NextResponse.json({ error: `dispatch failed (${gh.status})` }, { status: 502 });
  }
  return NextResponse.json({ ok: true }, { status: 202 });
}
