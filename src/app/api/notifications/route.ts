import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const address = searchParams.get("address");
    if (!address)
      return new Response(JSON.stringify({ error: "缺少 address" }), {
        status: 400,
      });
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("notifications")
      .select("id, type, payload, is_read, created_at")
      .eq("user_address", address)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return new Response(JSON.stringify({ items: data || [] }), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "服务端错误" }), {
      status: 500,
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { address, ids } = body ?? {};
    if (!address || !Array.isArray(ids) || ids.length === 0) {
      return new Response(JSON.stringify({ error: "缺少 address 或 ids" }), {
        status: 400,
      });
    }
    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_address", address)
      .in("id", ids);
    if (error) throw error;
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "服务端错误" }), {
      status: 500,
    });
  }
}
