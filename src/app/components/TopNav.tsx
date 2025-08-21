"use client";

import Link from "next/link";
import { useAccount } from "wagmi";
import { Identity, Name, Avatar } from "@coinbase/onchainkit/identity";
import { base as baseChain } from "wagmi/chains";
import { ConnectWallet } from "@coinbase/onchainkit/wallet";

export default function TopNav() {
  const { address } = useAccount();
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-background/80 backdrop-blur">
      <div className="mx-auto max-w-6xl px-3 sm:px-6 py-2 flex items-center justify-between gap-3">
        <Link href="/" className="font-bold tracking-tight text-xl sm:text-2xl">
          Kudos Tribe
        </Link>
        <nav className="hidden sm:flex items-center gap-3 text-sm">
          <Link className="hover:opacity-80" href="/">
            Home
          </Link>
          <Link className="hover:opacity-80" href="/communities">
            Communities
          </Link>
          <Link className="hover:opacity-80" href="/rankings">
            Rankings
          </Link>
          <Link className="hover:opacity-80" href="/notifications">
            Notifications
          </Link>
          {address && (
            <Link className="hover:opacity-80" href={`/u/${address}`}>
              Me
            </Link>
          )}
        </nav>
        <div className="flex items-center gap-3">
          <Identity address={address ?? undefined} chain={baseChain}>
            <Avatar className="h-6 w-6" />
            <Name />
          </Identity>
          <ConnectWallet />
        </div>
      </div>
    </header>
  );
}
