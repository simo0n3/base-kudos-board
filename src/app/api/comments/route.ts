import { NextRequest } from "next/server";
import { recoverMessageAddress, type Hex } from "viem";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

type CommentRecord = {
  id: string;
  messageId: string;
  address: string;
  content: string;
  createdAt: string;
};

const inMemoryComments: CommentRecord[] = [];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { address, messageId, content, signature } = body ?? {};
    if (!address || !messageId || !content || !signature) {
      return new Response(JSON.stringify({ error: "缺少必要字段" }), {
        status: 400,
      });
    }

    const raw = `BaseKudosComment|${address}|${messageId}|${content}`;
    const recovered = await recoverMessageAddress({
      message: raw,
      signature: signature as Hex,
    });
    if (recovered.toLowerCase() !== address.toLowerCase()) {
      return new Response(JSON.stringify({ error: "签名地址不匹配" }), {
        status: 400,
      });
    }

    const rec: CommentRecord = {
      id: `${Date.now()}`,
      messageId,
      address,
      content,
      createdAt: new Date().toISOString(),
    };

    try {
      const supabase = getSupabaseAdmin();
      const { error } = await supabase.from("comments").insert({
        id: rec.id,
        message_id: messageId,
        address,
        content,
        created_at: rec.createdAt,
      });
      if (error) throw error;
      // 通知消息作者（如果能查到）
      const { data: msgRow } = await supabase
        .from("messages")
        .select("author_address")
        .eq("id", messageId)
        .single();
      const toAddress = (msgRow as any)?.author_address as string | undefined;
      if (toAddress) {
        await supabase.from("notifications").insert({
          id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          user_address: toAddress,
          type: "comment",
          payload: { messageId, from: address, content },
          is_read: false,
          created_at: new Date().toISOString(),
        });
      }
    } catch {
      inMemoryComments.unshift(rec);
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
  if (!messageId) {
    return new Response(JSON.stringify({ error: "缺少 messageId" }), {
      status: 400,
    });
  }
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("comments")
      .select("id, message_id, address, content, created_at")
      .eq("message_id", messageId)
      .order("created_at", { ascending: true })
      .limit(50);
    if (error) throw error;
    const items = (data || []).map((d: any) => ({
      id: d.id,
      messageId: d.message_id,
      address: d.address,
      content: d.content,
      createdAt: d.created_at,
    }));
    return new Response(JSON.stringify({ items }), { status: 200 });
  } catch {
    const items = inMemoryComments
      .filter((c) => c.messageId === messageId)
      .slice(0, 50);
    return new Response(JSON.stringify({ items }), { status: 200 });
  }
}
