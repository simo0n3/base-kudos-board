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
        <NavItem href="/" label="Home" />
        <NavItem href="/communities" label="Communities" />
        <NavItem href="/rankings" label="Rankings" />
        <NavItem href="/notifications" label="Notifications" />
        {address && <NavItem href={`/u/${address}`} label="My Profile" />}
        <NavItem href="/mini" label="Post" />
      </nav>
    </aside>
  );
}
