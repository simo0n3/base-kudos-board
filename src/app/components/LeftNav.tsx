"use client";

import Link from "next/link";
import { useAccount } from "wagmi";
import { usePathname } from "next/navigation";

function NavItem({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = pathname === href;
  return (
    <Link
      href={href}
      className={`block px-3 py-2 rounded hover:bg-white/10 ${
        active ? "bg-white/10 font-medium" : "opacity-90"
      }`}
    >
      {label}
    </Link>
  );
}

export default function LeftNav() {
  const { address } = useAccount();
  return (
    <aside className="sticky top-[56px] h-[calc(100dvh-56px)] pt-4">
      <nav className="flex flex-col gap-1 text-sm">
        <NavItem href="/" label="首页" />
        <NavItem href="/communities" label="社群" />
        <NavItem href="/rankings" label="排行榜" />
        <NavItem href="/notifications" label="通知" />
        {address && <NavItem href={`/u/${address}`} label="我的主页" />}
        <NavItem href="/mini" label="发布留言" />
      </nav>
    </aside>
  );
}
