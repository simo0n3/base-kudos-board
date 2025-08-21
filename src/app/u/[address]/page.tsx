"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Identity, Name, Avatar } from "@coinbase/onchainkit/identity";
import { base as baseChain } from "wagmi/chains";
import Link from "next/link";
import { useAccount } from "wagmi";

export default function UserPage() {
  const params = useParams();
  const address = String(params?.address || "").toLowerCase();
  const [profile, setProfile] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { address: me, isConnected } = useAccount();
  const [following, setFollowing] = useState<boolean>(false);
  const [showAllMsgs, setShowAllMsgs] = useState<boolean>(false);
  const onShare = async () => {
    try {
      const url = typeof window !== "undefined" ? window.location.href : "";
      const text = `来看看 @${address} 的主页`;
      if ((navigator as any)?.share) {
        await (navigator as any).share({ title: "Base Kudos", text, url });
      } else if (navigator?.clipboard) {
        await navigator.clipboard.writeText(url);
        alert("链接已复制");
      }
    } catch {}
  };

  useEffect(() => {
    if (!address) return;
    (async () => {
      try {
        const res = await fetch(`/api/u/${address}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "加载失败");
        setProfile(json);
      } catch (e: any) {
        setError(e?.message || "加载失败");
      }
    })();
  }, [address]);

  useEffect(() => {
    (async () => {
      if (!address || !me) return;
      const res = await fetch(
        `/api/follows?follower=${me}&following=${address}`
      );
      const json = await res.json();
      setFollowing(!!json?.isFollowing);
    })();
  }, [address, me]);

  if (error) return <div className="p-6">{error}</div>;
  if (!profile) return <div className="p-6">加载中…</div>;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <Identity address={address as `0x${string}`} chain={baseChain}>
          <Avatar className="h-7 w-7" />
          <Name />
        </Identity>
        <div className="flex items-center gap-3">
          <div className="text-sm opacity-70">
            帖子 {profile.postCount} · 获赞 {profile.likeCount} · 打赏{" "}
            {profile.tipTotal} ETH（{profile.tipCount} 次）
          </div>
          <button className="btn btn-ghost" onClick={onShare}>
            分享
          </button>
        </div>
      </div>
      {isConnected && me?.toLowerCase() !== address.toLowerCase() && (
        <div>
          <button
            className="rounded px-3 py-1 text-sm bg-foreground text-background hover:opacity-90"
            onClick={async () => {
              try {
                const raw = `BaseKudosFollow|${me}|${address}|${
                  following ? "unfollow" : "follow"
                }`;
                const sig = await (window as any).ethereum?.request?.({
                  method: "personal_sign",
                  params: [raw, me],
                });
                const res = await fetch(`/api/follows`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    follower: me,
                    following: address,
                    action: following ? "unfollow" : "follow",
                    signature: sig,
                  }),
                });
                const json = await res.json();
                if (!res.ok) throw new Error(json?.error || "操作失败");
                setFollowing(!following);
              } catch (e) {
                console.error(e);
              }
            }}
          >
            {following ? "取消关注" : "关注"}
          </button>
        </div>
      )}
      <h2 className="text-lg font-semibold">我的留言</h2>
      <ul className="space-y-3">
        {(showAllMsgs
          ? profile.messages
          : (profile.messages || []).slice(0, 5)
        ).map((m: any) => (
          <li key={m.id} className="border rounded p-3">
            {m.imageUrl && (
              <img
                src={m.imageUrl}
                alt="图片"
                className="rounded w-full max-h-64 object-cover mb-2"
              />
            )}
            {m.isPaid && (
              <p className="text-xs opacity-70">
                付费内容 · 价格 {m.priceEth} ETH
              </p>
            )}
            {m.title && (
              <h3 className="text-base font-semibold mt-1">{m.title}</h3>
            )}
            <p className="text-sm mt-2 whitespace-pre-wrap">{m.content}</p>
            <div className="text-xs opacity-70 mt-1">
              {new Date(m.createdAt).toLocaleString()}
            </div>
            <div className="flex items-center gap-3 mt-2">
              <Link
                className="underline text-sm inline-block"
                href={`/m/${m.id}`}
              >
                查看详情
              </Link>
              {isConnected && me?.toLowerCase() === address && (
                <button
                  className="text-xs px-2 py-1 rounded border hover:opacity-90"
                  onClick={async () => {
                    if (!confirm("确认删除该留言？")) return;
                    try {
                      const res = await fetch(`/api/messages/${m.id}`, {
                        method: "DELETE",
                        headers: {
                          "x-user-address": String(me).toLowerCase(),
                        },
                      });
                      const json = await res.json();
                      if (!res.ok) throw new Error(json?.error || "删除失败");
                      // 重新加载个人资料
                      const r = await fetch(`/api/u/${address}`);
                      const j = await r.json();
                      if (r.ok) {
                        setProfile(j);
                      }
                    } catch (e) {
                      console.error(e);
                      alert((e as any)?.message || "删除失败");
                    }
                  }}
                >
                  删除
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
      {(profile.messages?.length || 0) > 5 && (
        <div className="pt-2">
          <button
            className="text-xs underline"
            onClick={() => setShowAllMsgs((v) => !v)}
          >
            {showAllMsgs ? "收起" : "显示更多"}
          </button>
        </div>
      )}

      {isConnected && me?.toLowerCase() === address && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">我解锁过的内容</h2>
          {profile.unlocked?.length ? (
            <ul className="space-y-3">
              {profile.unlocked.map((m: any) => (
                <li key={m.id} className="border rounded p-3">
                  {m.imageUrl && (
                    <img
                      src={m.imageUrl}
                      alt="图片"
                      className="rounded w-full max-h-64 object-cover mb-2"
                    />
                  )}
                  {m.isPaid && (
                    <p className="text-xs opacity-70">
                      付费内容 · 价格 {m.priceEth} ETH
                    </p>
                  )}
                  {m.title && (
                    <h3 className="text-base font-semibold mt-1">{m.title}</h3>
                  )}
                  <p className="text-sm mt-2 whitespace-pre-wrap">
                    {m.content}
                  </p>
                  <div className="text-xs opacity-70 mt-1">
                    {new Date(m.createdAt).toLocaleString()}
                  </div>
                  <Link
                    className="underline text-sm mt-1 inline-block"
                    href={`/m/${m.id}`}
                  >
                    查看详情
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm opacity-70">暂无</p>
          )}
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">我创建的社群</h2>
        {profile.createdCommunities?.length ? (
          <ul className="space-y-3">
            {profile.createdCommunities.map((c: any) => (
              <li key={c.id} className="border rounded p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{c.name}</div>
                    <div className="text-xs opacity-70">{c.desc}</div>
                  </div>
                  <div className="text-xs opacity-70">
                    {c.monthlyPriceEth} ETH / 月
                  </div>
                </div>
                <Link className="underline text-sm" href={`/c/${c.id}`}>
                  进入
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm opacity-70">暂无</p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">我加入的社群</h2>
        {profile.joinedCommunities?.length ? (
          <ul className="space-y-3">
            {profile.joinedCommunities.map((c: any) => (
              <li key={c.id} className="border rounded p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{c.name}</div>
                    <div className="text-xs opacity-70">{c.desc}</div>
                  </div>
                  <div className="text-xs opacity-70">
                    {c.monthlyPriceEth} ETH / 月
                  </div>
                </div>
                <Link className="underline text-sm" href={`/c/${c.id}`}>
                  进入
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm opacity-70">暂无</p>
        )}
      </section>
    </div>
  );
}
