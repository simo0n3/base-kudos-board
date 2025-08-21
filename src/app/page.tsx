"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAccount } from "wagmi";
import { Identity, Name, Avatar } from "@coinbase/onchainkit/identity";
import { base as baseChain } from "wagmi/chains";
import GuideCard from "@/app/components/GuideCard";

export default function Home() {
  const { address, isConnected } = useAccount();
  const [data, setData] = useState<{
    topMessages: any[];
    topAuthors: any[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hotComms, setHotComms] = useState<any[] | null>(null);
  const [visibleCount, setVisibleCount] = useState<number>(6);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

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
        if (!r1.ok) throw new Error(j1?.error || "Load failed");
        setData(j1);
        if (r2.ok) setHotComms(j2.items || []);
      } catch (e: any) {
        setError(e?.message || "Load failed");
      }
    })();
  }, []);

  // Auto load more (infinite scroll)
  useEffect(() => {
    if (!data || !data.topMessages?.length) return;
    const node = sentinelRef.current;
    if (!node) return;
    const io = new IntersectionObserver((entries) => {
      const [entry] = entries;
      if (entry.isIntersecting) {
        setVisibleCount((v) => Math.min(v + 6, data.topMessages.length));
      }
    });
    io.observe(node);
    return () => io.disconnect();
  }, [data]);

  return (
    <div className="p-4 sm:p-6">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Left nav */}
        <aside className="md:col-span-2 mt-2 sm:mt-3 order-1">
          <div className="card p-3 sm:p-4 space-y-2">
            <h2 className="text-sm font-semibold">Navigation</h2>
            <div className="flex flex-col gap-2">
              <Link className="btn btn-ghost" href="/mini">
                Post
              </Link>
              <Link className="btn btn-ghost" href="/communities">
                Communities
              </Link>
              <Link className="btn btn-ghost" href="/rankings">
                Rankings
              </Link>
              <Link className="btn btn-ghost" href="/notifications">
                Notifications
              </Link>
              {isConnected ? (
                <Link className="btn btn-ghost" href={`/u/${address}`}>
                  My profile
                </Link>
              ) : (
                <button className="btn opacity-60 cursor-not-allowed" disabled>
                  Connect wallet to view my profile
                </button>
              )}
            </div>
          </div>
        </aside>

        {/* Center content */}
        <main className="md:col-span-8 space-y-6 min-w-0 order-2">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Kudos Tribe
          </h1>
          <SearchBar />

          {!isConnected && (
            <div className="card p-3 sm:p-4 text-sm">
              Wallet not connected. Some features require connection.
            </div>
          )}
          {error && <div className="p-2 text-sm opacity-80">{error}</div>}
          {!data && !error && (
            <div className="p-2 text-sm opacity-80">Loading…</div>
          )}

          {data && data.topMessages?.length > 0 ? (
            <section className="space-y-3">
              <h2 className="text-lg sm:text-xl font-semibold mb-1">
                Top Messages
              </h2>
              <ul className="space-y-4">
                {data.topMessages.slice(0, visibleCount).map((m) => (
                  <li key={m.id} className="card p-4 sm:p-5 space-y-3">
                    <div className="flex items-center justify-between text-xs opacity-70">
                      <Identity address={m.author} chain={baseChain}>
                        <Avatar className="h-6 w-6" />
                        <Name />
                      </Identity>
                      <div>{new Date(m.createdAt).toLocaleString()}</div>
                    </div>
                    {m.title && (
                      <h3 className="text-2xl sm:text-3xl font-semibold tracking-tight">
                        {m.title}
                      </h3>
                    )}
                    {m.imageUrl && (
                      <img
                        src={m.imageUrl}
                        alt="image"
                        className="rounded-md w-full max-h-56 object-contain max-w-[720px] mx-auto"
                      />
                    )}
                    {m.isPaid && (
                      <span className="inline-block text-xs px-2 py-0.5 rounded bg-white/10">
                        Paid content · Price {m.priceEth} ETH
                      </span>
                    )}
                    {m.isPaid ? (
                      <p className="text-sm whitespace-pre-wrap leading-7 text-gray-400 italic">
                        This post is paid; open details below to unlock.
                      </p>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap leading-7">
                        {m.content}
                      </p>
                    )}
                    <div className="flex items-center gap-3 text-xs opacity-80 pt-2 border-t border-white/10">
                      <span>
                        Tips {m.tipTotal} ETH ({m.tipCount} times)
                      </span>
                      <span>Likes {m.likeCount}</span>
                      <Link className="underline ml-auto" href={`/m/${m.id}`}>
                        Comments / Details
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
              {visibleCount < (data.topMessages?.length || 0) && (
                <div ref={sentinelRef} className="h-8" />
              )}
            </section>
          ) : (
            <div className="card p-3 sm:p-4 text-sm">
              No posts yet. Go
              <Link className="underline mx-1" href="/mini">
                post
              </Link>
              one!
            </div>
          )}
        </main>

        {/* Right column: Top Authors + Top Communities */}
        <aside className="space-y-3 mt-2 sm:mt-3 md:col-span-2 order-3">
          <GuideCard />
          <div className="card p-3 sm:p-4">
            <h2 className="text-sm font-semibold mb-2">Top Authors</h2>
            {!data ? (
              <div className="text-xs opacity-70">Loading…</div>
            ) : (
              <ul className="space-y-3">
                {data.topAuthors.map((a) => (
                  <li key={a.author} className="text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0 max-w-[70%] overflow-hidden">
                        <Identity address={a.author} chain={baseChain}>
                          <Avatar className="h-5 w-5" />
                          <Name className="truncate" />
                        </Identity>
                      </div>
                      <Link
                        className="text-xs underline shrink-0"
                        href={`/u/${a.author}`}
                      >
                        View
                      </Link>
                    </div>
                    <div className="text-xs opacity-80 mt-1">
                      Posts: {a.postCount} · Tips:{" "}
                      {a.tipTotal.toFixed?.(6) ?? a.tipTotal} ETH · Likes:{" "}
                      {a.likeCount}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="card p-3 sm:p-4">
            <h2 className="text-sm font-semibold mb-2">Top Communities</h2>
            {!hotComms ? (
              <div className="text-xs opacity-70">Loading…</div>
            ) : hotComms.length === 0 ? (
              <div className="text-xs opacity-70">No data</div>
            ) : (
              <ul className="space-y-2 text-sm">
                {hotComms.map((c: any) => (
                  <li
                    key={c.id}
                    className="flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="truncate">{c.name}</div>
                      <div className="text-[11px] opacity-70">
                        Joined {c.member_count ?? 0}
                      </div>
                    </div>
                    <Link
                      className="text-xs underline shrink-0"
                      href={`/c/${c.id}`}
                    >
                      Enter
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function SearchBar() {
  const [q, setQ] = useState("");
  return (
    <form
      className="flex items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const target = `/search?q=${encodeURIComponent(q.trim())}`;
        window.location.href = target;
      }}
    >
      <input
        className="flex-1 border rounded px-3 py-2 text-sm bg-background text-foreground placeholder:opacity-70"
        placeholder="Search text or 0x prefix"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <button className="btn btn-primary" type="submit">
        Search
      </button>
    </form>
  );
}
