import { NextRequest } from "next/server";
import { recoverMessageAddress, type Hex } from "viem";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const address = searchParams.get("address");
  const follower = searchParams.get("follower");
  const following = searchParams.get("following");
  const supabase = getSupabaseAdmin();

  try {
    if (follower && following) {
      const { data, error } = await supabase
        .from("follows")
        .select("follower, following")
        .eq("follower", follower)
        .eq("following", following)
        .limit(1);
      if (error) throw error;
      return new Response(
        JSON.stringify({ isFollowing: (data?.length ?? 0) > 0 }),
        { status: 200 }
      );
    }

    if (!address) {
      return new Response(
        JSON.stringify({ error: "缺少 address 或 follower/following" }),
        { status: 400 }
      );
    }

    const [followers, followingList] = await Promise.all([
      supabase
        .from("follows")
        .select("follower", { count: "exact", head: true })
        .eq("following", address),
      supabase
        .from("follows")
        .select("following", { count: "exact", head: true })
        .eq("follower", address),
    ]);
    if (followers.error) throw followers.error;
    if (followingList.error) throw followingList.error;
    return new Response(
      JSON.stringify({
        followerCount: followers.count ?? 0,
        followingCount: followingList.count ?? 0,
      }),
      { status: 200 }
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "服务端错误" }), {
      status: 500,
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { follower, following, action, signature } = body ?? {};
    if (!follower || !following || !action || !signature) {
      return new Response(JSON.stringify({ error: "缺少必要字段" }), {
        status: 400,
      });
    }
    if (follower.toLowerCase() === following.toLowerCase()) {
      return new Response(JSON.stringify({ error: "不可关注自己" }), {
        status: 400,
      });
    }

    const raw = `BaseKudosFollow|${follower}|${following}|${action}`;
    const recovered = await recoverMessageAddress({
      message: raw,
      signature: signature as Hex,
    });
    if (recovered.toLowerCase() !== follower.toLowerCase()) {
      return new Response(JSON.stringify({ error: "签名地址不匹配" }), {
        status: 400,
      });
    }

    const supabase = getSupabaseAdmin();
    if (action === "follow") {
      const { error } = await supabase
        .from("follows")
        .insert({ follower, following, created_at: new Date().toISOString() });
      if (
        error &&
        !String(error.message || "")
          .toLowerCase()
          .includes("duplicate")
      )
        throw error;
      // 通知被关注者
      await supabase.from("notifications").insert({
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        user_address: following,
        type: "follow",
        payload: { follower },
        is_read: false,
        created_at: new Date().toISOString(),
      });
    } else if (action === "unfollow") {
      const { error } = await supabase
        .from("follows")
        .delete()
        .eq("follower", follower)
        .eq("following", following);
      if (error) throw error;
    } else {
      return new Response(JSON.stringify({ error: "非法 action" }), {
        status: 400,
      });
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "服务端错误" }), {
      status: 500,
    });
  }
}
