import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("messages")
      .select(
        "id, author_address, title, content, created_at, image_url, is_paid, price_eth"
      )
      .eq("id", id)
      .single();
    if (error) throw error;
    if (!data)
      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
      });
    return new Response(
      JSON.stringify({
        id: data.id,
        address: data.author_address,
        title: data.title || null,
        content: data.content,
        createdAt: data.created_at,
        imageUrl: data.image_url || null,
        isPaid: !!data.is_paid,
        priceEth: data.price_eth || null,
      }),
      { status: 200 }
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "服务端错误" }), {
      status: 500,
    });
  }
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    const supabase = getSupabaseAdmin();
    // 从请求头中获取发起人地址，用于基础校验（前端会签名，简化：服务端先按地址匹配作者）
    const address = req.headers.get("x-user-address")?.toLowerCase();
    if (!address) {
      return new Response(JSON.stringify({ error: "缺少地址" }), {
        status: 400,
      });
    }
    // 确认该消息作者
    const { data: msg, error: msgErr } = await supabase
      .from("messages")
      .select("author_address")
      .eq("id", id)
      .single();
    if (msgErr) throw msgErr;
    if (!msg)
      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
      });
    if ((msg as any).author_address?.toLowerCase() !== address) {
      return new Response(JSON.stringify({ error: "无权限" }), { status: 403 });
    }
    const { error } = await supabase.from("messages").delete().eq("id", id);
    if (error) throw error;
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "服务端错误" }), {
      status: 500,
    });
  }
}
