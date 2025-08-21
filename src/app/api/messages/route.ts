import { NextRequest } from "next/server";
import { recoverMessageAddress, type Hex } from "viem";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

type MessageRecord = {
  id: string;
  title?: string;
  address: string;
  content: string;
  signature: string;
  createdAt: string;
};

const inMemoryMessages: MessageRecord[] = [];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, address, content, signature, imageUrl, isPaid, priceEth } =
      body ?? {};
    if (!address || !content || !signature) {
      return new Response(JSON.stringify({ error: "缺少必要字段" }), {
        status: 400,
      });
    }

    // 组装与客户端一致的 message 文本（简化：拼接字符串）。
    // 更严格可使用 EIP-712；此处为 MVP 简化。
    // 兼容两种签名格式：
    // 1) BaseKudos|address|title|content（新格式）
    // 2) BaseKudos|address|content（旧格式，向后兼容）
    const candidates = [
      `BaseKudos|${address}|${(body?.title ?? "").toString()}|${content}`,
      `BaseKudos|${address}|${content}`,
    ];
    let recoveredOk = false;
    let recovered = "" as string;
    for (const msg of candidates) {
      try {
        const r = await recoverMessageAddress({
          message: msg,
          signature: signature as Hex,
        });
        if (r.toLowerCase() === address.toLowerCase()) {
          recoveredOk = true;
          recovered = r;
          break;
        }
      } catch (_e) {
        // ignore and try next
      }
    }
    if (!recoveredOk) {
      return new Response(
        JSON.stringify({ error: "签名校验失败，请确认标题与内容与签名一致" }),
        { status: 400 }
      );
    }

    const rec: MessageRecord = {
      id: `${Date.now()}`,
      title,
      address,
      content,
      signature,
      createdAt: new Date().toISOString(),
    };
    try {
      const supabase = getSupabaseAdmin();
      const { error } = await supabase.from("messages").insert({
        id: rec.id,
        author_address: address,
        title: title ?? null,
        content,
        signature,
        created_at: rec.createdAt,
        image_url: imageUrl ?? null,
        is_paid: !!isPaid,
        price_eth: priceEth ?? null,
      });
      if (error) throw error;
    } catch {
      inMemoryMessages.unshift(rec);
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

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("messages")
      .select(
        "id, author_address, title, content, created_at, image_url, is_paid, price_eth"
      )
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    const items = (data || []).map((d: any) => ({
      id: d.id,
      address: d.author_address,
      title: d.title || null,
      content: d.content,
      createdAt: d.created_at,
      imageUrl: d.image_url || null,
      isPaid: !!d.is_paid,
      priceEth: d.price_eth || null,
      signature: "",
    }));
    return new Response(JSON.stringify({ items }), { status: 200 });
  } catch {
    return new Response(
      JSON.stringify({ items: inMemoryMessages.slice(0, 50) }),
      { status: 200 }
    );
  }
}
