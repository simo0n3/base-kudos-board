import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const viewer = searchParams.get("viewer")?.toLowerCase();
    const { data, error } = await supabase
      .from("communities")
      .select(
        "id, owner_address, name, desc, image_url, monthly_price_eth, created_at"
      )
      .eq("id", id)
      .single();
    if (error) throw error;
    if (!data)
      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
      });
    // active member count
    const nowIso = new Date().toISOString();
    const { count: activeCount } = await supabase
      .from("community_memberships")
      .select("id", { count: "exact", head: true })
      .eq("community_id", id)
      .gt("end_at", nowIso);
    // viewer membership
    let viewerEndAt: string | null = null;
    if (viewer) {
      const { data: mem } = await supabase
        .from("community_memberships")
        .select("end_at")
        .eq("community_id", id)
        .eq("member_address", viewer)
        .order("end_at", { ascending: false })
        .limit(1)
        .single();
      viewerEndAt = (mem as any)?.end_at ?? null;
    }
    return new Response(
      JSON.stringify({
        ...data,
        active_member_count: activeCount ?? 0,
        viewer_end_at: viewerEndAt,
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
    const address = req.headers.get("x-user-address")?.toLowerCase();
    if (!address) {
      return new Response(JSON.stringify({ error: "缺少地址" }), {
        status: 400,
      });
    }
    const { data: comm, error: cErr } = await supabase
      .from("communities")
      .select("owner_address")
      .eq("id", id)
      .single();
    if (cErr) throw cErr;
    if (!comm)
      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
      });
    if ((comm as any).owner_address?.toLowerCase() !== address) {
      return new Response(JSON.stringify({ error: "无权限" }), { status: 403 });
    }

    // 删除关联内容
    const delMemberships = await supabase
      .from("community_memberships")
      .delete()
      .eq("community_id", id);
    if (delMemberships.error) throw delMemberships.error;
    const delPosts = await supabase
      .from("community_posts")
      .delete()
      .eq("community_id", id);
    if (delPosts.error) throw delPosts.error;
    const delComm = await supabase.from("communities").delete().eq("id", id);
    if (delComm.error) throw delComm.error;
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "服务端错误" }), {
      status: 500,
    });
  }
}
