import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    // 拉取最近的消息（限制 500）
    const { data: messages, error: msgErr } = await supabase
      .from("messages")
      .select(
        "id, author_address, content, created_at, image_url, is_paid, price_eth"
      )
      .order("created_at", { ascending: false })
      .limit(500);
    if (msgErr) throw msgErr;

    const ids = (messages || []).map((m: any) => m.id);
    if (ids.length === 0) {
      return new Response(JSON.stringify({ topMessages: [], topAuthors: [] }), {
        status: 200,
      });
    }

    // Tips 按 message 聚合
    const { data: tips, error: tipsErr } = await supabase
      .from("tips")
      .select("message_id, amount, token_symbol")
      .in("message_id", ids);
    if (tipsErr) throw tipsErr;

    // Likes 按 message 聚合
    const { data: likes, error: likesErr } = await supabase
      .from("likes")
      .select("message_id")
      .in("message_id", ids);
    if (likesErr) throw likesErr;

    const tipsByMessage: Record<string, { total: number; count: number }> = {};
    for (const t of tips || []) {
      const key = t.message_id as string;
      const amount = parseFloat(String(t.amount || 0)) || 0;
      const acc = tipsByMessage[key] || { total: 0, count: 0 };
      acc.total += amount;
      acc.count += 1;
      tipsByMessage[key] = acc;
    }

    const likesByMessage: Record<string, number> = {};
    for (const l of likes || []) {
      const key = l.message_id as string;
      likesByMessage[key] = (likesByMessage[key] || 0) + 1;
    }

    // Top 留言：按 (tips total, likes count) 排序
    const topMessages = (messages || [])
      .map((m: any) => {
        const tip = tipsByMessage[m.id] || { total: 0, count: 0 };
        const likeCount = likesByMessage[m.id] || 0;
        return {
          id: m.id,
          author: m.author_address,
          content: m.content,
          createdAt: m.created_at,
          imageUrl: m.image_url || null,
          isPaid: !!m.is_paid,
          priceEth: m.price_eth || null,
          tipTotal: Number(tip.total.toFixed(6)),
          tipCount: tip.count,
          likeCount,
          score: tip.total * 10 + likeCount, // 简单打分：打赏权重更高
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);

    // Top 作者：按作者合并
    const authorMap: Record<
      string,
      {
        tipTotal: number;
        tipCount: number;
        likeCount: number;
        postCount: number;
      }
    > = {};
    const messageById: Record<string, any> = Object.fromEntries(
      (messages || []).map((m: any) => [m.id, m])
    );
    for (const m of messages || []) {
      const a = (authorMap[m.author_address] ||= {
        tipTotal: 0,
        tipCount: 0,
        likeCount: 0,
        postCount: 0,
      });
      a.postCount += 1;
    }
    for (const [messageId, agg] of Object.entries(tipsByMessage)) {
      const author = messageById[messageId]?.author_address;
      if (!author) continue;
      const a = (authorMap[author] ||= {
        tipTotal: 0,
        tipCount: 0,
        likeCount: 0,
        postCount: 0,
      });
      a.tipTotal += agg.total;
      a.tipCount += agg.count;
    }
    for (const [messageId, count] of Object.entries(likesByMessage)) {
      const author = messageById[messageId]?.author_address;
      if (!author) continue;
      const a = (authorMap[author] ||= {
        tipTotal: 0,
        tipCount: 0,
        likeCount: 0,
        postCount: 0,
      });
      a.likeCount += count as number;
    }

    const topAuthors = Object.entries(authorMap)
      .map(([author, v]) => ({
        author,
        ...v,
        score: v.tipTotal * 10 + v.likeCount,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);

    return new Response(JSON.stringify({ topMessages, topAuthors }), {
      status: 200,
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "服务端错误" }), {
      status: 500,
    });
  }
}
