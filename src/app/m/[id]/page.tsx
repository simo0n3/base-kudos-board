"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAccount, useSendTransaction } from "wagmi";
import { parseEther } from "viem";
import { Identity, Name, Avatar } from "@coinbase/onchainkit/identity";
import { base as baseChain } from "wagmi/chains";

export default function MessageDetailPage() {
  const params = useParams();
  const messageId = String(params?.id || "");
  const { address, isConnected } = useAccount();
  const { sendTransactionAsync, isPending } = useSendTransaction();
  const [purchased, setPurchased] = useState<boolean>(false);

  const [msg, setMsg] = useState<any | null>(null);
  const [likeCount, setLikeCount] = useState<number>(0);
  const [amount, setAmount] = useState<string>("0.001");
  const [result, setResult] = useState<string | null>(null);

  const load = async () => {
    const r = await fetch(`/api/messages/${messageId}`);
    const d = await r.json();
    if (r.ok) setMsg(d);
    const lr = await fetch(`/api/likes?messageId=${messageId}`);
    const ld = await lr.json();
    setLikeCount(ld.count ?? 0);
    try {
      if (address && d?.priceEth) {
        const pr = await fetch(
          `/api/tips?messageId=${messageId}&buyer=${address}`
        );
        const pd = await pr.json();
        const need = parseFloat(String(d.priceEth || 0)) || 0;
        const paid = parseFloat(String(pd.buyerTotalEth || 0)) || 0;
        setPurchased(paid >= need && need > 0);
      }
    } catch {}
  };

  const fetchedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!messageId) return;
    if (fetchedRef.current === messageId) return;
    fetchedRef.current = messageId;
    setPurchased(false); // 切换帖子时先重置解锁状态，防止沿用上一个帖子的状态
    load();
  }, [messageId]);

  // 切换地址时也重置，等待新地址的解锁校验结果
  useEffect(() => {
    setPurchased(false);
  }, [address]);

  // 切换地址或再次进入页面时，按打赏总额重新检查解锁状态
  useEffect(() => {
    (async () => {
      if (!address || !messageId) return;
      try {
        const pr = await fetch(
          `/api/tips?messageId=${messageId}&buyer=${address}`
        );
        const pd = await pr.json();
        const need = parseFloat(String(msg?.priceEth || 0)) || 0;
        const paid = parseFloat(String(pd.buyerTotalEth || 0)) || 0;
        setPurchased(paid >= need && need > 0);
      } catch {}
    })();
  }, [address, messageId, msg?.priceEth]);

  if (!msg) return <div className="p-6">加载中…</div>;

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <Identity address={msg.address} chain={baseChain}>
          <Avatar className="h-6 w-6" />
          <Name />
        </Identity>
        <Link className="text-xs underline" href="/">
          返回首页
        </Link>
      </div>
      {msg.title && (
        <h2 className="text-xl sm:text-2xl font-semibold">{msg.title}</h2>
      )}
      {msg.imageUrl && (
        <img
          src={msg.imageUrl}
          alt="图片"
          className="rounded w-full max-h-[540px] object-cover"
        />
      )}
      {msg.isPaid &&
      !purchased &&
      address?.toLowerCase() !== msg.address.toLowerCase() ? (
        <Paywall
          messageId={messageId}
          seller={msg.address}
          priceEth={msg.priceEth || "0.001"}
          onPurchased={() => setPurchased(true)}
        />
      ) : (
        <p className="text-base whitespace-pre-wrap leading-relaxed">
          {msg.content}
        </p>
      )}

      <TipsSummary messageId={messageId} />

      <div className="flex items-center gap-3">
        <button
          className="rounded px-2 py-1 text-xs border hover:opacity-90"
          disabled={!isConnected}
          onClick={async () => {
            if (!address) return;
            try {
              const raw = `BaseKudosLike|${address}|${messageId}`;
              const sig = await (window as any).ethereum?.request?.({
                method: "personal_sign",
                params: [raw, address],
              });
              const res = await fetch(`/api/likes`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ address, messageId, signature: sig }),
              });
              const data = await res.json();
              if (!res.ok) throw new Error(data?.error || "点赞失败");
              const lr = await fetch(`/api/likes?messageId=${messageId}`);
              const ld = await lr.json();
              setLikeCount(ld.count ?? 0);
            } catch (e: any) {
              setResult(e?.message || "点赞失败");
            }
          }}
        >
          点赞
        </button>
        <span className="text-xs opacity-70">{likeCount} 赞</span>
      </div>

      {isConnected && address?.toLowerCase() !== msg.address.toLowerCase() && (
        <div className="flex items-center gap-2">
          <input
            type="number"
            step="0.0001"
            min="0"
            className="w-24 border rounded px-2 py-1 text-xs bg-background text-foreground placeholder:opacity-70"
            placeholder="0.001"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <button
            className="rounded px-2 py-1 text-xs bg-foreground text-background hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={isPending}
            onClick={async () => {
              const amt = parseFloat(amount || "0.001");
              if (!amt || amt <= 0) {
                setResult("请输入正确金额");
                return;
              }
              try {
                const hash = await sendTransactionAsync({
                  to: msg.address,
                  value: parseEther(String(amt)),
                });
                await fetch(`/api/tips`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    messageId,
                    to: msg.address,
                    txHash: hash,
                    amount: String(amt),
                    token: "ETH",
                    from: address,
                    chainId: 84532,
                  }),
                });
                setResult(`打赏成功，tx ${hash}`);
                // 通知本页的小计刷新
                const evt = new CustomEvent("tips-updated", {
                  detail: { messageId },
                });
                window.dispatchEvent(evt);
                // 若为付费内容，则在打赏后自动检查是否已达解锁阈值
                if (
                  msg.isPaid &&
                  address?.toLowerCase() !== msg.address.toLowerCase()
                ) {
                  const pr = await fetch(
                    `/api/tips?messageId=${messageId}&buyer=${address}`
                  );
                  const pd = await pr.json();
                  const need = parseFloat(String(msg.priceEth || 0)) || 0;
                  const paid = parseFloat(String(pd.buyerTotalEth || 0)) || 0;
                  if (paid >= need && need > 0) {
                    setPurchased(true);
                    setResult(`已解锁，tx ${hash}`);
                  }
                }
              } catch (e: any) {
                setResult(e?.message || "打赏失败");
              }
            }}
          >
            打赏
          </button>
        </div>
      )}

      <Comments messageId={messageId} />

      {result && <p className="text-xs opacity-80">{result}</p>}
    </div>
  );
}

function Paywall({
  messageId,
  seller,
  priceEth,
  onPurchased,
}: {
  messageId: string;
  seller: string;
  priceEth: string;
  onPurchased: () => void;
}) {
  const { address, isConnected } = useAccount();
  const { sendTransactionAsync, isPending } = useSendTransaction();
  const [err, setErr] = useState<string | null>(null);

  return (
    <div className="border border-white/10 rounded p-3 bg-white/5 space-y-2">
      <p className="text-sm">该内容需付费解锁：{priceEth} ETH</p>
      <button
        className="rounded px-3 py-2 text-sm bg-foreground text-[#0f1115] hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
        disabled={!isConnected || isPending}
        onClick={async () => {
          if (!address) return;
          try {
            const tx = await sendTransactionAsync({
              to: seller,
              value: parseEther(String(priceEth || "0.001")),
            });
            // 写入一条打赏记录用于统一统计与解锁判断
            await fetch(`/api/tips`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                messageId,
                to: seller,
                from: address,
                amount: String(priceEth),
                token: "ETH",
                txHash: tx,
                chainId: 84532,
              }),
            });
            // 再次检查解锁状态
            const pr = await fetch(
              `/api/tips?messageId=${messageId}&buyer=${address}`
            );
            const pd = await pr.json();
            const need = parseFloat(String(priceEth || 0)) || 0;
            const paid = parseFloat(String(pd.buyerTotalEth || 0)) || 0;
            if (paid >= need && need > 0) {
              onPurchased();
              // 通知本页的小计刷新
              const evt = new CustomEvent("tips-updated", {
                detail: { messageId },
              });
              window.dispatchEvent(evt);
            }
          } catch (e: any) {
            setErr(e?.message || "支付失败");
          }
        }}
      >
        支付解锁
      </button>
      {err && <p className="text-xs opacity-80">{err}</p>}
    </div>
  );
}

function TipsSummary({ messageId }: { messageId: string }) {
  const [summary, setSummary] = useState<{
    totalCount: number;
    totalAmountEth: string;
  } | null>(null);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/tips?messageId=${messageId}`);
      const data = await res.json();
      setSummary({
        totalCount: data.totalCount ?? 0,
        totalAmountEth: data.totalAmountEth ?? "0",
      });
    }
    load();
    const handler = (e: any) => {
      if (e?.detail?.messageId === messageId) load();
    };
    window.addEventListener("tips-updated", handler);
    return () => window.removeEventListener("tips-updated", handler);
  }, [messageId]);

  if (!summary) return null;
  return (
    <p className="text-xs opacity-80">
      已获得打赏：{summary.totalAmountEth} ETH（{summary.totalCount} 次）
    </p>
  );
}

function Comments({ messageId }: { messageId: string }) {
  const { address, isConnected } = useAccount();
  const [items, setItems] = useState<any[]>([]);
  const [val, setVal] = useState("");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const r = await fetch(`/api/comments?messageId=${messageId}`);
    const d = await r.json();
    setItems(d.items || []);
  };
  useEffect(() => {
    load();
  }, [messageId]);

  const submit = async () => {
    if (!isConnected || !address || !val.trim()) return;
    setLoading(true);
    try {
      const raw = `BaseKudosComment|${address}|${messageId}|${val}`;
      const sig = await (window as any).ethereum?.request?.({
        method: "personal_sign",
        params: [raw, address],
      });
      const res = await fetch(`/api/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address,
          messageId,
          content: val,
          signature: sig,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "评论失败");
      setVal("");
      load();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <h3 className="text-lg font-semibold mt-4">评论</h3>
      <ul className="space-y-2">
        {items.map((c) => (
          <li key={c.id} className="text-xs">
            {c.address.slice(0, 6)}…{c.address.slice(-4)}：{c.content}
          </li>
        ))}
      </ul>
      <div className="flex items-center gap-2">
        <input
          className="flex-1 border rounded px-2 py-1 text-xs bg-background text-foreground placeholder:opacity-70"
          placeholder="写下评论…"
          value={val}
          onChange={(e) => setVal(e.target.value)}
        />
        <button
          className="rounded px-2 py-1 text-xs bg-foreground text-background hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
          disabled={!isConnected || !val.trim() || loading}
          onClick={submit}
        >
          发送
        </button>
      </div>
    </div>
  );
}
