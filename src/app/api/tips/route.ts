import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

type TipRecord = {
  id: string;
  messageId: string;
  to: string;
  txHash: string;
  amount: string;
  token: string;
  from?: string;
  createdAt: string;
};

const inMemoryTips: TipRecord[] = [];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messageId, to, txHash, amount, token, from, chainId } = body ?? {};
    if (!messageId || !to || !txHash || !amount || !token) {
      return new Response(JSON.stringify({ error: "缺少必要字段" }), {
        status: 400,
      });
    }
    const rec: TipRecord = {
      id: `${Date.now()}`,
      messageId,
      to,
      txHash,
      amount,
      token,
      createdAt: new Date().toISOString(),
    };
    try {
      const supabase = getSupabaseAdmin();
      const { error } = await supabase.from("tips").insert({
        id: rec.id,
        message_id: messageId,
        to_address: to,
        from_address: from ? String(from).toLowerCase() : null,
        chain_id: chainId ?? 84532,
        tx_hash: txHash,
        amount,
        token_symbol: token,
        created_at: rec.createdAt,
      });
      if (error) throw error;
      // 通知消息作者（如果不是自己给自己打赏）
      const { data: msgRow } = await supabase
        .from("messages")
        .select("author_address")
        .eq("id", messageId)
        .single();
      const toAddress = (msgRow as any)?.author_address as string | undefined;
      if (
        toAddress &&
        (!from || toAddress.toLowerCase() !== String(from).toLowerCase())
      ) {
        await supabase.from("notifications").insert({
          id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          user_address: toAddress,
          type: "tip",
          payload: { messageId, from, amount, token, txHash },
          is_read: false,
          created_at: new Date().toISOString(),
        });
      }
    } catch {
      inMemoryTips.unshift(rec);
    }
    return new Response(JSON.stringify({ ok: true, id: rec.id }), {
      status: 200,
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "服务端错误" }), {
      status: 500,
    });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const messageId = searchParams.get("messageId");
  const buyer = searchParams.get("buyer");
  const buyerLc = buyer ? String(buyer).toLowerCase() : null;

  try {
    const supabase = getSupabaseAdmin();
    let query = supabase
      .from("tips")
      .select(
        "id, message_id, from_address, to_address, tx_hash, amount, token_symbol, chain_id, created_at"
      );
    if (messageId) query = query.eq("message_id", messageId);
    const { data, error } = await query
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    const items = (data || []).map((d: any) => ({
      id: d.id,
      messageId: d.message_id,
      from: d.from_address,
      to: d.to_address,
      txHash: d.tx_hash,
      amount: d.amount,
      token: d.token_symbol,
      chainId: d.chain_id,
      createdAt: d.created_at,
    }));
    const totalCount = items.length;
    const totalAmountEth = items
      .reduce((acc, cur) => acc + (parseFloat(cur.amount) || 0), 0)
      .toFixed(6);
    const buyerTotalEth = buyerLc
      ? items
          .filter((it) => (it.from || "").toLowerCase() === buyerLc)
          .reduce((acc, cur) => acc + (parseFloat(cur.amount) || 0), 0)
          .toFixed(6)
      : undefined;
    return new Response(
      JSON.stringify({ items, totalCount, totalAmountEth, buyerTotalEth }),
      {
        status: 200,
      }
    );
  } catch {
    const items = messageId
      ? inMemoryTips.filter((t) => t.messageId === messageId)
      : inMemoryTips;
    const sliced = items.slice(0, 50);
    const totalAmountEth = sliced
      .reduce((acc, cur) => acc + (parseFloat(cur.amount) || 0), 0)
      .toFixed(6);
    const buyerTotalEth = buyerLc
      ? sliced
          .filter(
            (it) =>
              (it as any).from && (it as any).from!.toLowerCase() === buyerLc
          )
          .reduce((acc, cur) => acc + (parseFloat(cur.amount) || 0), 0)
          .toFixed(6)
      : undefined;
    return new Response(
      JSON.stringify({
        items: sliced,
        totalCount: sliced.length,
        totalAmountEth,
        buyerTotalEth,
      }),
      { status: 200 }
    );
  }
}
