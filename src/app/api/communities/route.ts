import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { recoverMessageAddress, type Hex } from "viem";

type Community = {
  id: string;
  owner_address: string;
  name: string;
  desc?: string | null;
  image_url?: string | null;
  monthly_price_eth: string;
  created_at: string;
};

const inMemoryCommunities: Community[] = [];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim().toLowerCase();
  try {
    const supabase = getSupabaseAdmin();
    let query = supabase
      .from("communities")
      .select(
        "id, owner_address, name, desc, image_url, monthly_price_eth, created_at"
      )
      .order("created_at", { ascending: false })
      .limit(200);
    if (q) {
      // 简易搜索：名称或描述 ilike
      query = query.ilike("name", `%${q}%`);
    }
    const { data, error } = await query;
    if (error) throw error;
    return new Response(JSON.stringify({ items: data || [] }), { status: 200 });
  } catch (e) {
    const items = inMemoryCommunities
      .filter((c) => (q ? c.name.toLowerCase().includes(q) : true))
      .slice(0, 200);
    return new Response(JSON.stringify({ items, source: "memory" }), {
      status: 200,
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { owner, name, desc, imageUrl, monthlyPriceEth, signature } =
      body ?? {};
    if (!owner || !name || !monthlyPriceEth || !signature) {
      return new Response(JSON.stringify({ error: "缺少必要字段" }), {
        status: 400,
      });
    }
    // 校验签名：BaseKudosCommunityCreate|owner|name|monthlyPriceEth
    const raw = `BaseKudosCommunityCreate|${owner}|${name}|${monthlyPriceEth}`;
    const recovered = await recoverMessageAddress({
      message: raw,
      signature: signature as Hex,
    });
    if (recovered.toLowerCase() !== owner.toLowerCase()) {
      return new Response(JSON.stringify({ error: "签名地址不匹配" }), {
        status: 400,
      });
    }

    const rec: Community = {
      id: `${Date.now()}`,
      owner_address: owner.toLowerCase(),
      name,
      desc: desc || null,
      image_url: imageUrl || null,
      monthly_price_eth: String(monthlyPriceEth),
      created_at: new Date().toISOString(),
    };

    try {
      const supabase = getSupabaseAdmin();
      const { error } = await supabase.from("communities").insert({
        id: rec.id,
        owner_address: rec.owner_address,
        name: rec.name,
        desc: rec.desc,
        image_url: rec.image_url,
        monthly_price_eth: rec.monthly_price_eth,
        created_at: rec.created_at,
      });
      if (error) throw error;
    } catch (dbError) {
      inMemoryCommunities.unshift(rec);
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
