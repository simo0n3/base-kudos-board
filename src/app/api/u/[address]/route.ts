import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ address: string }> }
) {
  try {
    const { address: raw } = await ctx.params;
    const address = raw.toLowerCase();
    const supabase = getSupabaseAdmin();

    const [
      { data: msgs, error: msgErr },
      { data: tips, error: tipsErr },
      { data: myBuys, error: buysErr },
      { data: likes, error: likesErr },
      { data: myCommunities, error: commErr },
      { data: myMemberships, error: memErr },
    ] = await Promise.all([
      supabase
        .from("messages")
        .select(
          "id, title, content, created_at, image_url, is_paid, price_eth, author_address"
        )
        .ilike("author_address", address)
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("tips")
        .select("message_id, amount")
        .eq("to_address", address)
        .order("created_at", { ascending: false })
        .limit(2000),
      supabase
        .from("tips")
        .select("message_id, amount")
        .eq("from_address", address)
        .order("created_at", { ascending: false })
        .limit(2000),
      supabase
        .from("likes")
        .select("message_id")
        .order("created_at", { ascending: false })
        .limit(5000),
      supabase
        .from("communities")
        .select("id, name, desc, monthly_price_eth, created_at, owner_address")
        .ilike("owner_address", address)
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("community_memberships")
        .select("community_id, end_at, member_address")
        .eq("member_address", address)
        .order("end_at", { ascending: false })
        .limit(2000),
    ]);
    if (msgErr || tipsErr || likesErr || buysErr || commErr || memErr)
      throw msgErr || tipsErr || likesErr || buysErr || commErr || memErr;

    const messageIds = new Set((msgs || []).map((m: any) => m.id));
    let tipTotal = 0;
    let tipCount = 0;
    let likeCount = 0;
    for (const t of tips || []) {
      if (messageIds.has((t as any).message_id)) {
        tipTotal += parseFloat(String((t as any).amount || 0)) || 0;
        tipCount += 1;
      }
    }
    for (const l of likes || []) {
      if (messageIds.has((l as any).message_id)) {
        likeCount += 1;
      }
    }

    const messages = (msgs || []).map((m: any) => ({
      id: m.id,
      title: m.title,
      content: m.content,
      createdAt: m.created_at,
      imageUrl: m.image_url,
      isPaid: m.is_paid,
      priceEth: m.price_eth,
    }));

    // 我解锁过的内容：按 message_id 去重
    const unlockedIds = new Set<string>();
    for (const t of myBuys || []) {
      unlockedIds.add((t as any).message_id);
    }
    const unlockedMessages = (msgs || [])
      .filter((m: any) => unlockedIds.has(m.id))
      .map((m: any) => ({
        id: m.id,
        title: m.title,
        content: m.content,
        createdAt: m.created_at,
        imageUrl: m.image_url,
        isPaid: m.is_paid,
        priceEth: m.price_eth,
      }));

    // 我创建的社群
    const createdCommunities = (myCommunities || []).map((c: any) => ({
      id: c.id,
      name: c.name,
      desc: c.desc,
      monthlyPriceEth: c.monthly_price_eth,
      createdAt: c.created_at,
    }));

    // 我加入的社群（active）
    const nowTs = Date.now();
    const joinedIds = Array.from(
      new Set(
        (myMemberships || [])
          .filter((m: any) => m.end_at && new Date(m.end_at).getTime() > nowTs)
          .map((m: any) => m.community_id)
      )
    );
    let joinedCommunities: any[] = [];
    if (joinedIds.length > 0) {
      const { data: joinedRows, error: jErr } = await supabase
        .from("communities")
        .select("id, name, desc, monthly_price_eth, created_at")
        .in("id", joinedIds);
      if (jErr) throw jErr;
      joinedCommunities = (joinedRows || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        desc: c.desc,
        monthlyPriceEth: c.monthly_price_eth,
        createdAt: c.created_at,
      }));
    }

    return new Response(
      JSON.stringify({
        address,
        postCount: messages.length,
        tipTotal: Number(tipTotal.toFixed(6)),
        tipCount,
        likeCount,
        messages,
        unlocked: unlockedMessages,
        createdCommunities,
        joinedCommunities,
      }),
      { status: 200 }
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "服务端错误" }), {
      status: 500,
    });
  }
}
