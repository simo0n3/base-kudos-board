"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { Identity, Name, Avatar } from "@coinbase/onchainkit/identity";
import { base as baseChain } from "wagmi/chains";

export default function CommunitiesPage() {
  const { address, isConnected } = useAccount();
  const [items, setItems] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [price, setPrice] = useState("0.01");
  const [creating, setCreating] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  const load = async (query = "") => {
    const res = await fetch(
      `/api/communities${query ? `?q=${encodeURIComponent(query)}` : ""}`
    );
    const data = await res.json();
    setItems(data.items || []);
  };

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    load("");
  }, []);

  const create = async () => {
    if (!isConnected || !address || !name.trim()) return;
    setCreating(true);
    setResult(null);
    try {
      // 可选头像上传
      let imageUrl: string | undefined = undefined;
      const fileEl = document.getElementById(
        "community-cover"
      ) as HTMLInputElement | null;
      const file = fileEl?.files?.[0];
      if (file) {
        const fd = new FormData();
        fd.append("file", file);
        const up = await fetch("/api/upload", { method: "POST", body: fd });
        const uj = await up.json();
        if (!up.ok) throw new Error(uj?.error || "头像上传失败");
        imageUrl = uj.url as string;
      }

      const raw = `BaseKudosCommunityCreate|${address}|${name}|${price}`;
      const sig = await (window as any).ethereum?.request?.({
        method: "personal_sign",
        params: [raw, address],
      });
      const res = await fetch(`/api/communities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner: address,
          name,
          desc,
          imageUrl,
          monthlyPriceEth: price,
          signature: sig,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "创建失败");
      setResult("创建成功");
      setName("");
      setDesc("");
      setPrice("0.01");
      fileEl && (fileEl.value = "");
      load("");
    } catch (e: any) {
      setResult(e?.message || "创建失败");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">社群</h1>
        <Identity address={address ?? undefined} chain={baseChain}>
          <Avatar className="h-6 w-6" />
          <Name />
        </Identity>
      </div>

      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          load(q.trim());
        }}
      >
        <input
          className="flex-1 border rounded px-3 py-2 text-sm bg-white/5"
          placeholder="搜索社群"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button className="rounded px-3 py-2 text-sm bg-foreground text-background">
          搜索
        </button>
      </form>

      <div className="space-y-2">
        <h2 className="text-lg font-semibold">创建社群</h2>
        <div className="grid gap-2">
          <input
            className="border rounded px-3 py-2 text-sm bg-white/5"
            placeholder="名称"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="border rounded px-3 py-2 text-sm bg-white/5"
            placeholder="简介（可选）"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />
          <div className="text-xs opacity-80">社群头像（可选）</div>
          <input
            id="community-cover"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
          />
          <div className="flex items-center gap-2">
            <input
              className="border rounded px-3 py-2 text-sm bg-white/5 w-32"
              type="number"
              step="0.0001"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
            <span className="text-sm opacity-70">ETH / 月</span>
          </div>
          <button
            disabled={!isConnected || creating}
            className="rounded px-3 py-2 text-sm bg-foreground text-[#0f1115]"
            onClick={create}
          >
            创建
          </button>
          {result && <p className="text-sm opacity-80">{result}</p>}
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">社群列表</h2>
        <ul className="space-y-3">
          {items.map((c) => (
            <li key={c.id} className="border rounded p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  {/* 显示头像 */}
                  {c.image_url && (
                    <img
                      src={c.image_url}
                      alt="avatar"
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  )}
                  <div>
                    <div className="font-medium truncate max-w-[200px]">
                      {c.name}
                    </div>
                    <div className="text-xs opacity-70 truncate max-w-[260px]">
                      {c.desc}
                    </div>
                  </div>
                </div>
                <div className="text-xs opacity-70">
                  {c.monthly_price_eth} ETH / 月
                </div>
              </div>
              <Link className="underline text-sm" href={`/c/${c.id}`}>
                进入
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
