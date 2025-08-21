"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Identity, Name, Avatar } from "@coinbase/onchainkit/identity";
import { base as baseChain } from "wagmi/chains";

export default function RankingsPage() {
  const [data, setData] = useState<{ topAuthors: any[] } | null>(null);
  const [hotComms, setHotComms] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchedRef = useRef(false);
  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    (async () => {
      try {
        const [r1, r2] = await Promise.all([
          fetch("/api/rankings"),
          fetch("/api/communities/hot"),
        ]);
        const j1 = await r1.json();
        const j2 = await r2.json();
        if (!r1.ok) throw new Error(j1?.error || "加载失败");
        setData({ topAuthors: j1.topAuthors || [] });
        if (r2.ok) setHotComms(j2.items || []);
      } catch (e: any) {
        setError(e?.message || "加载失败");
      }
    })();
  }, []);

  if (error) return <div className="p-6">{error}</div>;
  if (!data) return <div className="p-6">加载中…</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">排行榜</h1>
      <div className="grid grid-cols-12 gap-4">
        <section className="col-span-12 md:col-span-6 card p-4 sm:p-5">
          <h2 className="text-lg font-semibold mb-2">Top 作者</h2>
          <ul className="space-y-3">
            {data.topAuthors.map((a) => (
              <li key={a.author} className="text-sm">
                <div className="flex items-center justify-between gap-2">
                  <Identity address={a.author} chain={baseChain}>
                    <Avatar className="h-6 w-6" />
                    <Name />
                  </Identity>
                  <Link className="text-xs underline" href={`/u/${a.author}`}>
                    查看主页
                  </Link>
                </div>
                <div className="text-xs opacity-80 mt-1">
                  帖子：{a.postCount} · 打赏：
                  {a.tipTotal.toFixed?.(6) ?? a.tipTotal} ETH（{a.tipCount} 次）
                  · 赞：{a.likeCount}
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="col-span-12 md:col-span-6 card p-4 sm:p-5">
          <h2 className="text-lg font-semibold mb-2">Top 社群</h2>
          {!hotComms ? (
            <div className="text-xs opacity-70">加载中…</div>
          ) : hotComms.length === 0 ? (
            <div className="text-xs opacity-70">暂无数据</div>
          ) : (
            <ul className="space-y-2 text-sm">
              {hotComms.map((c: any) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <img
                      src={c.image_url || "/file.svg"}
                      alt="avatar"
                      className="h-6 w-6 rounded-full object-cover"
                    />
                    <div className="min-w-0">
                      <div className="truncate">{c.name}</div>
                      <div className="text-[11px] opacity-70">
                        已加入 {c.member_count ?? 0} 人
                      </div>
                    </div>
                  </div>
                  <Link
                    className="text-xs underline shrink-0"
                    href={`/c/${c.id}`}
                  >
                    进入
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
