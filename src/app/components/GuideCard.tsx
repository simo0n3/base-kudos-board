"use client";

import { useEffect, useState } from "react";

export default function GuideCard() {
  const [dismissed, setDismissed] = useState<boolean>(false);

  useEffect(() => {
    try {
      const v = localStorage.getItem("bk_guide_dismissed");
      if (v === "1") setDismissed(true);
    } catch {}
  }, []);

  if (dismissed) return null;

  return (
    <div className="card p-3 sm:p-4 text-sm">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-semibold">Quick Guide</h3>
        <button
          className="text-xs underline"
          onClick={() => {
            try {
              localStorage.setItem("bk_guide_dismissed", "1");
            } catch {}
            setDismissed(true);
          }}
        >
          Dismiss
        </button>
      </div>
      <ul className="list-disc pl-5 space-y-1 opacity-90">
        <li>Tips accumulate in real time under posts</li>
        <li>Paid posts unlock automatically after payment</li>
        <li>Communities: join monthly to view private feed</li>
      </ul>
    </div>
  );
}
