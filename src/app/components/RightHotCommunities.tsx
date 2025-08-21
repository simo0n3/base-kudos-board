"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

export default function RightHotCommunities() {
  const [items, setItems] = useState<any[]>([]);
  const fetchedRef = useRef(false);
  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    (async () => {
      try {
        const r = await fetch("/api/communities/hot");
        const d = await r.json();
        if (r.ok) setItems(d.items || []);
      } catch {}
    })();
  }, []);
  if (!items.length) return null;
  return (
    <aside className="sticky top-[56px] h-fit pt-4">
      <div className="card p-4">
        <h3 className="text-sm font-semibold mb-2">热门社群</h3>
        <ul className="space-y-2 text-sm">
          {items.map((c: any) => (
            <li key={c.id} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <img
                  src={c.image_url || "/file.svg"}
                  alt="avatar"
                  className="h-6 w-6 rounded-full object-cover"
                />
                <span className="truncate">{c.name}</span>
              </div>
              <Link className="underline text-xs" href={`/c/${c.id}`}>
                进入
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
