"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Identity, Name, Avatar } from "@coinbase/onchainkit/identity";
import { base as baseChain } from "wagmi/chains";

export default function SearchPage() {
  const sp = useSearchParams();
  const q = sp.get("q") || "";
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lastQ = useRef<string | null>(null);
  useEffect(() => {
    if (lastQ.current === q) return;
    lastQ.current = q;
    (async () => {
      if (!q) {
        setItems([]);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "搜索失败");
        setItems(data.items || []);
      } catch (e: any) {
        setError(e?.message || "搜索失败");
      } finally {
        setLoading(false);
      }
    })();
  }, [q]);

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">搜索</h1>
      <p className="text-sm opacity-70">关键词：{q || "(空)"}</p>
      {loading && <div className="text-sm opacity-80">搜索中…</div>}
      {error && <div className="text-sm opacity-80">{error}</div>}
      {!loading && !error && (
        <ul className="space-y-4">
          {items.map((m) => (
            <li
              key={m.id}
              className="border border-white/10 rounded-lg p-3 sm:p-4 bg-white/5"
            >
              <div className="flex items-center justify-between">
                <Identity address={m.address} chain={baseChain}>
                  <Avatar className="h-6 w-6" />
                  <Name />
                </Identity>
                <div className="text-xs opacity-70">
                  {new Date(m.createdAt).toLocaleString()}
                </div>
              </div>
              <div className="mt-3">
                {m.imageUrl && (
                  <img
                    src={m.imageUrl}
                    alt="图片"
                    className="w-full max-h-[420px] object-cover rounded mb-3"
                  />
                )}
              </div>
              {m.isPaid && (
                <p className="text-xs opacity-70">
                  付费内容 · 价格 {m.priceEth} ETH
                </p>
              )}
              {m.title && (
                <h3 className="text-lg font-semibold mb-1">{m.title}</h3>
              )}
              {m.isPaid ? (
                <p className="text-base whitespace-pre-wrap leading-relaxed text-gray-400 italic">
                  该内容为付费内容，点击查看详情解锁。
                </p>
              ) : (
                <p className="text-base whitespace-pre-wrap leading-relaxed">
                  {m.content}
                </p>
              )}
              <Link className="underline text-sm" href={`/m/${m.id}`}>
                查看详情
              </Link>
            </li>
          ))}
          {items.length === 0 && <li className="text-sm opacity-70">无结果</li>}
        </ul>
      )}
    </div>
  );
}
