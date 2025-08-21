import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    const body = await req.json();
    const { member, txHash, amount, chainId = 84532 } = body ?? {};
    if (!member || !txHash || !amount) {
      return new Response(JSON.stringify({ error: "缺少必要字段" }), {
        status: 400,
      });
    }
    const supabase = getSupabaseAdmin();
    const now = new Date();
    const startAt = now.toISOString();
    const endAt = new Date(
      now.getTime() + 30 * 24 * 60 * 60 * 1000
    ).toISOString();

    // 如果已存在会员，续期：把 end_at 延长 30 天（从当前 end_at 开始）
    const { data: existed } = await supabase
      .from("community_memberships")
      .select("id, end_at")
      .eq("community_id", id)
      .eq("member_address", member.toLowerCase())
      .single();

    if (existed?.end_at) {
      const base =
        new Date(existed.end_at).getTime() > now.getTime()
          ? new Date(existed.end_at).getTime()
          : now.getTime();
      const newEnd = new Date(base + 30 * 24 * 60 * 60 * 1000).toISOString();
      const { error: updErr } = await supabase
        .from("community_memberships")
        .update({ end_at: newEnd, tx_hash: txHash, amount, chain_id: chainId })
        .eq("id", existed.id);
      if (updErr) throw updErr;
      return new Response(JSON.stringify({ ok: true, endAt: newEnd }), {
        status: 200,
      });
    }

    const { error } = await supabase.from("community_memberships").insert({
      id: `${Date.now()}`,
      community_id: id,
      member_address: member.toLowerCase(),
      start_at: startAt,
      end_at: endAt,
      tx_hash: txHash,
      amount,
      chain_id: chainId,
      created_at: now.toISOString(),
    });
    if (error) throw error;
    return new Response(JSON.stringify({ ok: true, endAt }), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "服务端错误" }), {
      status: 500,
    });
  }
}
