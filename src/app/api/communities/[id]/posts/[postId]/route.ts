import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; postId: string }> }
) {
  try {
    const { id, postId } = await ctx.params;
    const { searchParams } = new URL(req.url);
    const viewer = searchParams.get("viewer")?.toLowerCase();
    if (!viewer)
      return new Response(JSON.stringify({ error: "缺少 viewer" }), {
        status: 400,
      });

    const supabase = getSupabaseAdmin();
    // 校验权限：群主或有效会员
    const [{ data: comm }, { data: member }] = await Promise.all([
      supabase
        .from("communities")
        .select("owner_address")
        .eq("id", id)
        .single(),
      supabase
        .from("community_memberships")
        .select("id, end_at")
        .eq("community_id", id)
        .eq("member_address", viewer)
        .single(),
    ]);
    const now = Date.now();
    const isOwner = comm?.owner_address?.toLowerCase() === viewer;
    const isActiveMember =
      member?.end_at && new Date(member.end_at).getTime() > now;
    if (!isOwner && !isActiveMember) {
      return new Response(JSON.stringify({ error: "未加入或已过期" }), {
        status: 403,
      });
    }

    const { data, error } = await supabase
      .from("community_posts")
      .select(
        "id, community_id, author_address, title, content, image_url, created_at"
      )
      .eq("id", postId)
      .eq("community_id", id)
      .single();
    if (error) throw error;
    if (!data)
      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
      });
    return new Response(
      JSON.stringify({
        id: data.id,
        communityId: data.community_id,
        author: data.author_address,
        title: data.title,
        content: data.content,
        imageUrl: data.image_url,
        createdAt: data.created_at,
      }),
      { status: 200 }
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "服务端错误" }), {
      status: 500,
    });
  }
}
