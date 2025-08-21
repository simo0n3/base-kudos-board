"use client";

import { useEffect, useMemo, useState } from "react";
import { useAccount, useDisconnect } from "wagmi";
import { ConnectWallet } from "@coinbase/onchainkit/wallet";
import { Identity, Name, Avatar } from "@coinbase/onchainkit/identity";
import { base as baseChain } from "wagmi/chains";
import { Signature } from "@coinbase/onchainkit/signature";

export default function MiniPage() {
  const { address, isConnected } = useAccount();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isPaid, setIsPaid] = useState(false);
  const [priceEth, setPriceEth] = useState<string>("0.001");

  const { disconnect, connectors } = useDisconnect();
  // 作为编辑发布页面，不再展示他人留言

  async function submitMessage(signature: string) {
    if (!address) return;
    setSubmitting(true);
    setResult(null);
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
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address,
          title: title?.trim() || null,
          content,
          signature,
          imageUrl,
          isPaid,
          priceEth: isPaid ? priceEth : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "提交失败");
      setResult("提交成功");
      setTitle("");
      setContent("");
      setImageFile(null);
      setImagePreview(null);
      setIsPaid(false);
      setPriceEth("0.001");
    } catch (e: any) {
      setResult(e.message || "提交失败");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto py-10 space-y-6">
      <h1 className="text-2xl font-semibold">发布留言</h1>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Identity address={address ?? undefined} chain={baseChain}>
            <Avatar className="h-6 w-6" />
            <Name />
          </Identity>
        </div>
        <div className="flex items-center gap-2">
          <ConnectWallet />
          {isConnected && (
            <button
              className="border rounded px-2 py-1 text-xs"
              onClick={() => {
                connectors.forEach((c) => disconnect({ connector: c }));
              }}
            >
              断开连接
            </button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <input
          className="w-full border border-white/10 rounded-md p-3 text-base bg-white/5 text-foreground placeholder:opacity-70"
          placeholder="输入标题（可选，但推荐）"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          className="w-full border rounded-md p-3 text-sm bg-background text-foreground placeholder:opacity-70"
          rows={4}
          placeholder="写下一句感谢/留言..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />

        <Signature
          disabled={!isConnected || !content || submitting}
          message={`BaseKudos|${address ?? "0x"}|${title}|${content}`}
          label="签名并提交"
          onSuccess={(sig) => submitMessage(sig)}
          onError={(err) => setResult(err?.message || "签名失败")}
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

        <div className="flex items-center gap-3 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isPaid}
              onChange={(e) => setIsPaid(e.target.checked)}
            />
            需要付费查看
          </label>
          {isPaid && (
            <input
              type="number"
              step="0.0001"
              min="0"
              className="w-28 border border-white/10 rounded px-2 py-1 text-xs bg-white/5 text-foreground"
              value={priceEth}
              onChange={(e) => setPriceEth(e.target.value)}
              placeholder="价格(ETH)"
            />
          )}
        </div>
      </div>

      {result && <p className="text-sm opacity-80">{result}</p>}
      <p className="text-xs opacity-60">测试网：Base Sepolia</p>
    </div>
  );
}
