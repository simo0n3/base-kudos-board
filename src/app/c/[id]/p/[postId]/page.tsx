"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useAccount } from "wagmi";
import Link from "next/link";
import { Identity, Name, Avatar } from "@coinbase/onchainkit/identity";
import { base as baseChain } from "wagmi/chains";

export default function CommunityPostDetailPage() {
  const params = useParams();
  const communityId = String(params?.id || "");
  const postId = String(params?.postId || "");
  const { address } = useAccount();
  const [post, setPost] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef<string | null>(null);

  const load = async () => {
    try {
      const res = await fetch(
        `/api/communities/${communityId}/posts/${postId}?viewer=${address}`
      );
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error || "Load failed");
      setPost(d);
    } catch (e: any) {
      setError(e?.message || "Load failed");
    }
  };

  useEffect(() => {
    if (!communityId || !postId) return;
    const key = `${communityId}:${postId}`;
    if (fetchedRef.current === key) return;
    fetchedRef.current = key;
    load();
  }, [communityId, postId, address]);

  if (error) return <div className="p-6">{error}</div>;
  if (!post) return <div className="p-6">Loading…</div>;

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <Identity address={post.author} chain={baseChain}>
          <Avatar className="h-6 w-6" />
          <Name />
        </Identity>
        <Link className="text-xs underline" href={`/c/${communityId}`}>
          Back to community
        </Link>
      </div>
      {post.title && <h2 className="text-xl font-semibold">{post.title}</h2>}
      {post.imageUrl && (
        <img
          src={post.imageUrl}
          alt="image"
          className="rounded w-full max-h-[540px] object-cover"
        />
      )}
      <p className="text-base whitespace-pre-wrap leading-relaxed">
        {post.content}
      </p>
      <div className="text-xs opacity-70">
        {new Date(post.createdAt).toLocaleString()}
      </div>
    </div>
  );
}
