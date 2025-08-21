import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) {
      return new Response(JSON.stringify({ error: "未选择文件" }), {
        status: 400,
      });
    }

    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.type)) {
      return new Response(JSON.stringify({ error: "不支持的图片类型" }), {
        status: 400,
      });
    }
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      return new Response(JSON.stringify({ error: "图片超过 2MB 限制" }), {
        status: 400,
      });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      console.error("UPLOAD_ERROR Missing Supabase env", {
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseKey,
      });
      return new Response(
        JSON.stringify({ error: "服务器未配置 Supabase 环境变量" }),
        { status: 500 }
      );
    }

    const supabase = getSupabaseAdmin();
    const arrayBuffer = await file.arrayBuffer();

    const ext = file.type.split("/").pop() || "bin";
    const now = new Date();
    const key = `images/${now.getFullYear()}/${
      now.getMonth() + 1
    }/${now.getTime()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from("kudos-images")
      .upload(key, arrayBuffer, { contentType: file.type, upsert: false });
    if (uploadErr) {
      console.error("UPLOAD_ERROR upload", uploadErr);
      return new Response(
        JSON.stringify({ error: uploadErr.message || "上传失败" }),
        { status: 500 }
      );
    }

    const { data: publicData, error: urlErr } = supabase.storage
      .from("kudos-images")
      .getPublicUrl(key);
    if (urlErr) {
      console.error("UPLOAD_ERROR publicUrl", urlErr);
    }
    const url = publicData.publicUrl;

    return new Response(JSON.stringify({ url, key }), { status: 200 });
  } catch (e: any) {
    console.error("UPLOAD_ERROR unexpected", e);
    return new Response(
      JSON.stringify({ error: e?.message || "服务端错误", stack: e?.stack }),
      { status: 500 }
    );
  }
}
