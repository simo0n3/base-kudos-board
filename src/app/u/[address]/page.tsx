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
      const text = `Check out @${address}'s profile`;
      if ((navigator as any)?.share) {
        await (navigator as any).share({ title: "Kudos Tribe", text, url });
      } else if (navigator?.clipboard) {
        await navigator.clipboard.writeText(url);
        alert("Link copied");
      }
    } catch {}
  };

  useEffect(() => {
    if (!address) return;
    (async () => {
      try {
        const res = await fetch(`/api/u/${address}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "Load failed");
        setProfile(json);
      } catch (e: any) {
        setError(e?.message || "Load failed");
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
  if (!profile) return <div className="p-6">Loading…</div>;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <Identity address={address as `0x${string}`} chain={baseChain}>
          <Avatar className="h-7 w-7" />
          <Name />
        </Identity>
        <div className="flex items-center gap-3">
          <div className="text-sm opacity-70">
            Posts {profile.postCount} · Likes {profile.likeCount} · Tips{" "}
            {profile.tipTotal} ETH ({profile.tipCount} times)
          </div>
          <button className="btn btn-ghost" onClick={onShare}>
            Share
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
                if (!res.ok) throw new Error(json?.error || "Action failed");
                setFollowing(!following);
              } catch (e) {
                console.error(e);
              }
            }}
          >
            {following ? "Unfollow" : "Follow"}
          </button>
        </div>
      )}
      <h2 className="text-lg font-semibold">My Posts</h2>
      <ul className="space-y-3">
        {(showAllMsgs
          ? profile.messages
          : (profile.messages || []).slice(0, 5)
        ).map((m: any) => (
          <li key={m.id} className="border rounded p-3">
            {m.imageUrl && (
              <img
                src={m.imageUrl}
                alt="image"
                className="rounded w-full max-h-64 object-cover mb-2"
              />
            )}
            {m.isPaid && (
              <p className="text-xs opacity-70">
                Paid content · Price {m.priceEth} ETH
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
                View details
              </Link>
              {isConnected && me?.toLowerCase() === address && (
                <button
                  className="text-xs px-2 py-1 rounded border hover:opacity-90"
                  onClick={async () => {
                    if (!confirm("Confirm deletion?")) return;
                    try {
                      const res = await fetch(`/api/messages/${m.id}`, {
                        method: "DELETE",
                        headers: {
                          "x-user-address": String(me).toLowerCase(),
                        },
                      });
                      const json = await res.json();
                      if (!res.ok)
                        throw new Error(json?.error || "Delete failed");
                      // Reload profile
                      const r = await fetch(`/api/u/${address}`);
                      const j = await r.json();
                      if (r.ok) {
                        setProfile(j);
                      }
                    } catch (e) {
                      console.error(e);
                      alert((e as any)?.message || "Delete failed");
                    }
                  }}
                >
                  Delete
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
            {showAllMsgs ? "Collapse" : "Show more"}
          </button>
        </div>
      )}

      {isConnected && me?.toLowerCase() === address && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Unlocked Content</h2>
          {profile.unlocked?.length ? (
            <ul className="space-y-3">
              {profile.unlocked.map((m: any) => (
                <li key={m.id} className="border rounded p-3">
                  {m.imageUrl && (
                    <img
                      src={m.imageUrl}
                      alt="image"
                      className="rounded w-full max-h-64 object-cover mb-2"
                    />
                  )}
                  {m.isPaid && (
                    <p className="text-xs opacity-70">
                      Paid content · Price {m.priceEth} ETH
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
                    View details
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm opacity-70">None</p>
          )}
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Communities I Created</h2>
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
                    {c.monthlyPriceEth} ETH / month
                  </div>
                </div>
                <Link className="underline text sm" href={`/c/${c.id}`}>
                  Enter
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm opacity-70">None</p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Communities I Joined</h2>
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
                    {c.monthlyPriceEth} ETH / month
                  </div>
                </div>
                <Link className="underline text-sm" href={`/c/${c.id}`}>
                  Enter
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm opacity-70">None</p>
        )}
      </section>
    </div>
  );
}
