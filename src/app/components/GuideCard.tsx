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
        <h3 className="font-semibold">新手引导</h3>
        <button
          className="text-xs underline"
          onClick={() => {
            try {
              localStorage.setItem("bk_guide_dismissed", "1");
            } catch {}
            setDismissed(true);
          }}
        >
          关闭
        </button>
      </div>
      <ul className="list-disc pl-5 space-y-1 opacity-90">
        <li>打赏会实时累计在帖子下方</li>
        <li>付费内容：支付后自动解锁查看</li>
        <li>社群：按月加入，成员可查看私密动态</li>
      </ul>
    </div>
  );
}
