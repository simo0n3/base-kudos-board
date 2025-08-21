"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";

type Noti = {
  id: string;
  type: string;
  payload: any;
  is_read: boolean;
  created_at: string;
};

export default function NotificationsPage() {
  const { address, isConnected } = useAccount();
  const [items, setItems] = useState<Noti[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!address) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/notifications?address=${address}`);
      const data = await res.json();
      setItems(data.items || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [address]);

  const markRead = async () => {
    if (!address) return;
    const ids = items.filter((i) => !i.is_read).map((i) => i.id);
    if (ids.length === 0) return;
    await fetch(`/api/notifications`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address, ids }),
    });
    load();
  };

  if (!isConnected)
    return <div className="p-6">Please connect your wallet</div>;

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Notifications</h1>
        <button
          className="rounded px-3 py-1 text-sm border hover:opacity-80"
          onClick={markRead}
          disabled={loading}
        >
          Mark as read
        </button>
      </div>
      {items.length === 0 ? (
        <div className="opacity-70 text-sm">No notifications</div>
      ) : (
        <ul className="space-y-3">
          {items.map((n) => (
            <li key={n.id} className="border rounded p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="opacity-70">
                  {new Date(n.created_at).toLocaleString()}
                </span>
                {!n.is_read && (
                  <span className="text-xs px-2 py-0.5 rounded bg-foreground text-background">
                    Unread
                  </span>
                )}
              </div>
              <div className="mt-2">{renderContent(n)}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function renderContent(n: Noti) {
  if (n.type === "like")
    return `Received like from ${n.payload?.from?.slice?.(0, 6)}…`;
  if (n.type === "tip")
    return `Received tip: ${n.payload?.amount} ${
      n.payload?.token
    } from ${n.payload?.from?.slice?.(0, 6)}…`;
  if (n.type === "comment") return `New comment: ${n.payload?.content}`;
  if (n.type === "follow")
    return `New follower: ${n.payload?.follower?.slice?.(0, 6)}… followed you`;
  return `${n.type}`;
}
