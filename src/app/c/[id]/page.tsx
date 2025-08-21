"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useAccount, useSendTransaction } from "wagmi";
import { parseEther } from "viem";
import Link from "next/link";
import { Identity, Name, Avatar } from "@coinbase/onchainkit/identity";
import { base as baseChain } from "wagmi/chains";

export default function CommunityDetailPage() {
  const params = useParams();
  const communityId = String(params?.id || "");
  const { address, isConnected } = useAccount();
  const { sendTransactionAsync, isPending } = useSendTransaction();

  const [comm, setComm] = useState<any | null>(null);
  const [feed, setFeed] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const fetchedRef = useRef<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const onShare = async () => {
    try {
      const url = typeof window !== "undefined" ? window.location.href : "";
      const text = comm?.name ? `来看看社群：${comm.name}` : "来看看这个社群";
      if ((navigator as any)?.share) {
        await (navigator as any).share({ title: "Base Kudos", text, url });
      } else if (navigator?.clipboard) {
        await navigator.clipboard.writeText(url);
        alert("链接已复制");
      }
    } catch {}
  };

  const load = async () => {
    const view = address ? `?viewer=${address}` : "";
    const res = await fetch(`/api/communities/${communityId}${view}`);
    const c = await res.json();
    if (res.ok) setComm(c);
    if (address) {
      const fr = await fetch(
        `/api/communities/${communityId}/feed?viewer=${address}`
      );
      const fd = await fr.json();
      if (fr.ok) setFeed(fd.items || []);
    }
  };

  useEffect(() => {
    if (!communityId) return;
    if (fetchedRef.current === communityId) return;
    fetchedRef.current = communityId;
    load();
  }, [communityId, address]);

  const join = async () => {
    if (!isConnected || !address || !comm) return;
    try {
      const tx = await sendTransactionAsync({
        to: comm.owner_address,
        value: parseEther(String(comm.monthly_price_eth || "0.01")),
      });
      const jr = await fetch(`/api/communities/${communityId}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          member: address,
          txHash: tx,
          amount: comm.monthly_price_eth,
        }),
      });
      const jd = await jr.json();
      if (!jr.ok) throw new Error(jd?.error || "加入失败");
      setResult("加入/续费成功");
      load();
    } catch (e: any) {
      setResult(e?.message || "加入失败");
    }
  };

  const post = async () => {
    if (!isConnected || !address || !title.trim() || !content.trim()) return;
    try {
      let imageUrl: string | undefined = undefined;
      if (imageFile) {
        const fd = new FormData();
        fd.append("file", imageFile);
        const up = await fetch("/api/upload", { method: "POST", body: fd });
        const uj = await up.json();
        if (!up.ok) throw new Error(uj?.error || "图片上传失败");
        imageUrl = uj.url as string;
      }
      const raw = `BaseKudosCommunityPost|${address}|${communityId}|${title}|${content}`;
      const sig = await (window as any).ethereum?.request?.({
        method: "personal_sign",
        params: [raw, address],
      });
      const pr = await fetch(`/api/communities/${communityId}/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          author: address,
          title,
          content,
          imageUrl,
          signature: sig,
        }),
      });
      const pd = await pr.json();
      if (!pr.ok) throw new Error(pd?.error || "发布失败");
      setTitle("");
      setContent("");
      setImageFile(null);
      setImagePreview(null);
      load();
    } catch (e: any) {
      setResult(e?.message || "发布失败");
    }
  };

  if (!comm) return <div className="p-6">加载中…</div>;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{comm.name}</h1>
        <div className="flex items-center gap-2">
          <button className="btn btn-ghost" onClick={onShare}>
            分享
          </button>
          <Link className="text-xs underline" href="/communities">
            返回社群
          </Link>
        </div>
      </div>
      {comm.image_url && (
        <img
          src={comm.image_url}
          alt="avatar"
          className="h-16 w-16 rounded-full object-cover"
        />
      )}
      <div className="text-sm opacity-70">{comm.desc}</div>
      <div className="text-sm opacity-80 flex items-center gap-3">
        <span>价格：{comm.monthly_price_eth} ETH / 月</span>
        <span>成员：{comm.active_member_count ?? 0}</span>
        {comm.viewer_end_at && (
          <span>
            到期：{new Date(comm.viewer_end_at).toLocaleString()}
            {new Date(comm.viewer_end_at).getTime() < Date.now() && (
              <span className="ml-1 text-red-400">(已过期)</span>
            )}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          className="rounded px-3 py-1 text-sm bg-foreground text-[#0f1115]"
          disabled={!isConnected || isPending}
          onClick={join}
        >
          {isPending ? "支付中…" : "加入/续费"}
        </button>
        {address?.toLowerCase() === comm.owner_address?.toLowerCase() && (
          <button
            className="rounded px-3 py-1 text-sm border hover:opacity-90"
            onClick={async () => {
              if (!confirm("确认解散该社群？此操作不可恢复")) return;
              try {
                const r = await fetch(`/api/communities/${communityId}`, {
                  method: "DELETE",
                  headers: { "x-user-address": String(address).toLowerCase() },
                });
                const j = await r.json();
                if (!r.ok) throw new Error(j?.error || "解散失败");
                window.location.href = "/communities";
              } catch (e: any) {
                setResult(e?.message || "解散失败");
              }
            }}
          >
            解散社群
          </button>
        )}
      </div>

      {/* 未加入提示 */}
      {!isConnected && (
        <div className="card p-3 sm:p-4 text-sm">
          未连接钱包，连接后可加入社群并查看私密内容。
        </div>
      )}

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">发帖（仅创建者）</h2>
        <input
          className="border rounded px-3 py-2 text-sm bg-white/5"
          placeholder="标题（可选）"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          className="border rounded px-3 py-2 text-sm bg-white/5"
          rows={4}
          placeholder="内容"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <div className="flex items-center gap-2">
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={(e) => {
              const f = e.target.files?.[0] || null;
              setImageFile(f);
              setImagePreview(f ? URL.createObjectURL(f) : null);
            }}
          />
          {imagePreview && (
            <img
              src={imagePreview}
              alt="预览"
              className="h-16 w-16 object-cover rounded"
            />
          )}
        </div>
        <button
          className="rounded px-3 py-2 text-sm bg-foreground text-[#0f1115]"
          disabled={!isConnected}
          onClick={post}
        >
          发布
        </button>
      </section>

      {result && <p className="text-sm opacity-80">{result}</p>}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">社群动态</h2>
        <ul className="space-y-3">
          {feed.map((p) => (
            <li key={p.id} className="border rounded p-3">
              <div className="flex items-center justify-between">
                <Identity address={p.author} chain={baseChain}>
                  <Avatar className="h-6 w-6" />
                  <Name />
                </Identity>
                <div className="text-xs opacity-70">
                  {new Date(p.createdAt).toLocaleString()}
                </div>
              </div>
              {p.imageUrl && (
                <img
                  src={p.imageUrl}
                  alt="图片"
                  className="mt-2 rounded w-full max-h-64 object-cover"
                />
              )}
              {p.title && <div className="font-medium mt-2">{p.title}</div>}
              <p className="text-sm mt-1 whitespace-pre-wrap">{p.content}</p>
              <Link
                className="underline text-sm mt-2 inline-block"
                href={`/c/${communityId}/p/${p.id}`}
              >
                查看详情
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
