import { NextRequest } from "next/server";
import { recoverMessageAddress, type Hex } from "viem";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

type LikeRecord = {
  id: string;
  messageId: string;
  address: string;
  createdAt: string;
};

const inMemoryLikes: LikeRecord[] = [];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { address, messageId, signature } = body ?? {};
    if (!address || !messageId || !signature) {
      return new Response(JSON.stringify({ error: "缺少必要字段" }), {
        status: 400,
      });
    }

    const rawMessage = `BaseKudosLike|${address}|${messageId}`;
    const recovered = await recoverMessageAddress({
      message: rawMessage,
      signature: signature as Hex,
    });
    if (recovered.toLowerCase() !== address.toLowerCase()) {
      return new Response(JSON.stringify({ error: "签名地址不匹配" }), {
        status: 400,
      });
    }

    const rec: LikeRecord = {
      id: `${Date.now()}`,
      messageId,
      address,
      createdAt: new Date().toISOString(),
    };

    try {
      const supabase = getSupabaseAdmin();
      const { error } = await supabase.from("likes").insert({
        id: rec.id,
        message_id: messageId,
        address,
        created_at: rec.createdAt,
      });
      // 若唯一键已存在，视为幂等成功
      if (error && !String(error.message || "").includes("duplicate")) {
        throw error;
      }
      if (!error) {
        const { data: msgRow } = await supabase
          .from("messages")
          .select("author_address")
          .eq("id", messageId)
          .single();
        const toAddress = (msgRow as any)?.author_address as string | undefined;
        if (toAddress && toAddress.toLowerCase() !== address.toLowerCase()) {
          await supabase.from("notifications").insert({
            id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            user_address: toAddress,
            type: "like",
            payload: { messageId, from: address },
            is_read: false,
            created_at: new Date().toISOString(),
          });
        }
      }
    } catch {
      const exists = inMemoryLikes.find(
        (l) =>
          l.messageId === messageId &&
          l.address.toLowerCase() === address.toLowerCase()
      );
      if (!exists) inMemoryLikes.push(rec);
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "服务端错误" }), {
      status: 500,
    });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const messageId = searchParams.get("messageId");
  if (!messageId) {
    return new Response(JSON.stringify({ error: "缺少 messageId" }), {
      status: 400,
    });
  }
  try {
    const supabase = getSupabaseAdmin();
    const { count, error } = await supabase
      .from("likes")
      .select("id", { count: "exact", head: true })
      .eq("message_id", messageId);
    if (error) throw error;
    return new Response(JSON.stringify({ count: count ?? 0 }), { status: 200 });
  } catch {
    const count = inMemoryLikes.filter((l) => l.messageId === messageId).length;
    return new Response(JSON.stringify({ count }), { status: 200 });
  }
}
