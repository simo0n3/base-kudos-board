import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { recoverMessageAddress, type Hex } from "viem";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    const body = await req.json();
    const { author, title, content, imageUrl, signature } = body ?? {};
    if (!author || !content || !signature) {
      return new Response(JSON.stringify({ error: "缺少必要字段" }), {
        status: 400,
      });
    }
    // 校验签名：BaseKudosCommunityPost|author|communityId|title|content
    const raw = `BaseKudosCommunityPost|${author}|${id}|${
      title || ""
    }|${content}`;
    const recovered = await recoverMessageAddress({
      message: raw,
      signature: signature as Hex,
    });
    if (recovered.toLowerCase() !== author.toLowerCase()) {
      return new Response(JSON.stringify({ error: "签名地址不匹配" }), {
        status: 400,
      });
    }

    const supabase = getSupabaseAdmin();
    // 仅社群创建者可发帖
    const { data: comm } = await supabase
      .from("communities")
      .select("owner_address")
      .eq("id", id)
      .single();
    const isOwner = comm?.owner_address?.toLowerCase() === author.toLowerCase();
    if (!isOwner) {
      return new Response(JSON.stringify({ error: "仅社群创建者可发帖" }), {
        status: 403,
      });
    }

    const rec = {
      id: `${Date.now()}`,
      community_id: id,
      author_address: author.toLowerCase(),
      title: title || null,
      content,
      image_url: imageUrl || null,
      created_at: new Date().toISOString(),
    };
    const { error } = await supabase.from("community_posts").insert(rec);
    if (error) throw error;
    return new Response(JSON.stringify({ ok: true, id: rec.id }), {
      status: 200,
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "服务端错误" }), {
      status: 500,
    });
  }
}
