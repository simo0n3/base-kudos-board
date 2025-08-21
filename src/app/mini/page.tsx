"use client";

import { useEffect, useMemo, useState } from "react";
import { useAccount, useDisconnect } from "wagmi";
import { ConnectWallet } from "@coinbase/onchainkit/wallet";
import { Identity, Name, Avatar } from "@coinbase/onchainkit/identity";
import { base as baseChain } from "wagmi/chains";
import { Signature } from "@coinbase/onchainkit/signature";

export default function MiniPage() {
  const { address, isConnected } = useAccount();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isPaid, setIsPaid] = useState(false);
  const [priceEth, setPriceEth] = useState<string>("0.001");

  const { disconnect, connectors } = useDisconnect();
  // Editor page only; not displaying others' posts

  async function submitMessage(signature: string) {
    if (!address) return;
    setSubmitting(true);
    setResult(null);
    try {
      let imageUrl: string | undefined = undefined;
      if (imageFile) {
        const fd = new FormData();
        fd.append("file", imageFile);
        const up = await fetch("/api/upload", { method: "POST", body: fd });
        const uj = await up.json();
        if (!up.ok) throw new Error(uj?.error || "Image upload failed");
        imageUrl = uj.url as string;
      }
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address,
          title: title?.trim() || null,
          content,
          signature,
          imageUrl,
          isPaid,
          priceEth: isPaid ? priceEth : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Submit failed");
      setResult("Submitted successfully");
      setTitle("");
      setContent("");
      setImageFile(null);
      setImagePreview(null);
      setIsPaid(false);
      setPriceEth("0.001");
    } catch (e: any) {
      setResult(e.message || "Submit failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto py-10 space-y-6">
      <h1 className="text-2xl font-semibold">Create Post</h1>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Identity address={address ?? undefined} chain={baseChain}>
            <Avatar className="h-6 w-6" />
            <Name />
          </Identity>
        </div>
        <div className="flex items-center gap-2">
          <ConnectWallet />
          {isConnected && (
            <button
              className="border rounded px-2 py-1 text-xs"
              onClick={() => {
                connectors.forEach((c) => disconnect({ connector: c }));
              }}
            >
              Disconnect
            </button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <input
          className="w-full border border-white/10 rounded-md p-3 text-base bg-white/5 text-foreground placeholder:opacity-70"
          placeholder="Title (optional, recommended)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          className="w-full border rounded-md p-3 text-sm bg-background text-foreground placeholder:opacity-70"
          rows={4}
          placeholder="Write your message..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />

        <Signature
          disabled={!isConnected || !content || submitting}
          message={`BaseKudos|${address ?? "0x"}|${title}|${content}`}
          label="Sign & Submit"
          onSuccess={(sig) => submitMessage(sig)}
          onError={(err) => setResult(err?.message || "Signature failed")}
        />

        <div className="flex items-center gap-2">
          <input
            id="mini-image-input"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0] || null;
              setImageFile(f);
              setImagePreview(f ? URL.createObjectURL(f) : null);
            }}
          />
          <label
            htmlFor="mini-image-input"
            className="inline-flex items-center gap-2 rounded px-3 py-2 text-xs border hover:opacity-90 cursor-pointer"
          >
            Choose image
          </label>
          <span className="text-xs opacity-70 truncate max-w-[200px]">
            {imageFile ? imageFile.name : "No image selected"}
          </span>
          {imagePreview && (
            <img
              src={imagePreview}
              alt="preview"
              className="h-16 w-16 object-cover rounded"
            />
          )}
        </div>

        <div className="flex items-center gap-3 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isPaid}
              onChange={(e) => setIsPaid(e.target.checked)}
            />
            Require payment to view
          </label>
          {isPaid && (
            <input
              type="number"
              step="0.0001"
              min="0"
              className="w-28 border border-white/10 rounded px-2 py-1 text-xs bg-white/5 text-foreground"
              value={priceEth}
              onChange={(e) => setPriceEth(e.target.value)}
              placeholder="Price (ETH)"
            />
          )}
        </div>
      </div>

      {result && <p className="text-sm opacity-80">{result}</p>}
      <p className="text-xs opacity-60">Testnet: Base Sepolia</p>
    </div>
  );
}
