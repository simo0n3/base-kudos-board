import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(_req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    // 简单排序：按最近一个月的成员数量降序，取前 5
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: memberships, error: memErr } = await supabase
      .from("community_memberships")
      .select("community_id")
      .gte("end_at", since);
    if (memErr) throw memErr;
    const countById: Record<string, number> = {};
    for (const m of memberships || []) {
      countById[(m as any).community_id] =
        (countById[(m as any).community_id] || 0) + 1;
    }
    const topIds = Object.entries(countById)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id]) => id);
    if (topIds.length === 0)
      return new Response(JSON.stringify({ items: [] }), { status: 200 });
    const { data: communities, error: cErr } = await supabase
      .from("communities")
      .select("id, name")
      .in("id", topIds);
    if (cErr) throw cErr;
    // 保持与排序一致
    const items = topIds
      .map((id) => {
        const c = (communities || []).find((x: any) => x.id === id);
        return c ? { ...c, member_count: countById[id] || 0 } : null;
      })
      .filter(Boolean);
    return new Response(JSON.stringify({ items }), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "服务端错误" }), {
      status: 500,
    });
  }
}
