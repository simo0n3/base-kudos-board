import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    const { searchParams } = new URL(req.url);
    const viewer = searchParams.get("viewer")?.toLowerCase();
    if (!viewer)
      return new Response(JSON.stringify({ error: "缺少 viewer" }), {
        status: 400,
      });

    const supabase = getSupabaseAdmin();
    // 检查是否群主或有效会员
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
      .eq("community_id", id)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    const items = (data || []).map((d: any) => ({
      id: d.id,
      communityId: d.community_id,
      author: d.author_address,
      title: d.title,
      content: d.content,
      imageUrl: d.image_url,
      createdAt: d.created_at,
    }));
    return new Response(JSON.stringify({ items }), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "服务端错误" }), {
      status: 500,
    });
  }
}
