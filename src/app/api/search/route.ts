import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const qRaw = (searchParams.get("q") || "").trim();
    const limitRaw = searchParams.get("limit");
    const limit = Math.min(
      Math.max(parseInt(limitRaw || "20", 10) || 20, 1),
      50
    );

    if (!qRaw) {
      return new Response(JSON.stringify({ items: [] }), { status: 200 });
    }

    const q = qRaw.slice(0, 100);
    const isAddr = q.startsWith("0x");

    const supabase = getSupabaseAdmin();

    const contentPromise = supabase
      .from("messages")
      .select("id, author_address, content, created_at, image_url")
      .ilike("content", `%${q}%`)
      .order("created_at", { ascending: false })
      .limit(limit);

    const addressPromise = isAddr
      ? supabase
          .from("messages")
          .select("id, author_address, content, created_at, image_url")
          .ilike("author_address", `${q}%`)
          .order("created_at", { ascending: false })
          .limit(limit)
      : Promise.resolve({ data: [] } as any);

    const [contentRes, addressRes] = await Promise.all([
      contentPromise,
      addressPromise,
    ]);
    const contentData = contentRes.data || [];
    const addressData = (addressRes as any).data || [];

    // 合并去重
    const byId: Record<string, any> = {};
    for (const row of [...contentData, ...addressData]) {
      byId[row.id] = row;
    }
    const merged = Object.values(byId)
      .sort(
        (a: any, b: any) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      .slice(0, limit)
      .map((d: any) => ({
        id: d.id,
        address: d.author_address,
        content: d.content,
        createdAt: d.created_at,
        imageUrl: d.image_url || null,
      }));

    return new Response(JSON.stringify({ items: merged }), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "服务端错误" }), {
      status: 500,
    });
  }
}
