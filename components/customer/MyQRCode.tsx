"use client";

import { useEffect, useState, useCallback } from "react";
import QRCode from "qrcode";
import { RefreshCw } from "lucide-react";

const QR_TTL_MS = 5 * 60 * 1000;

export function MyQRCode() {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [remaining, setRemaining] = useState<number>(QR_TTL_MS);
  const [loading, setLoading] = useState(false);

  const generateQR = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/qr/generate", { method: "POST" });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const expires = new Date(data.expiresAt);
      setExpiresAt(expires);
      setRemaining(expires.getTime() - Date.now());

      const url = await QRCode.toDataURL(data.payload, {
        width: 220,
        margin: 2,
        color: { dark: "#000000", light: "#ffffff" },
      });
      setQrDataUrl(url);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { generateQR(); }, [generateQR]);

  useEffect(() => {
    if (!expiresAt) return;
    const interval = setInterval(() => {
      const left = expiresAt.getTime() - Date.now();
      if (left <= 0) { setRemaining(0); clearInterval(interval); }
      else setRemaining(left);
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  const isExpired = remaining <= 0;

  return (
    <div className="card-gaming rounded-2xl p-5 flex flex-col items-center gap-4">
      {loading ? (
        <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
          生成中...
        </div>
      ) : qrDataUrl ? (
        <>
          <div className={`rounded-xl overflow-hidden transition-opacity ${isExpired ? "opacity-30" : ""}`}
            style={{ padding: "10px", background: "#fff" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrDataUrl} alt="マイQRコード" width={220} height={220} />
          </div>

          {isExpired ? (
            <p className="text-xs font-semibold" style={{ color: "var(--destructive)" }}>
              期限切れ — 更新してください
            </p>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">有効期限</span>
              <span className="font-mono font-bold text-sm" style={{ color: "var(--chip)" }}>
                {minutes}:{seconds.toString().padStart(2, "0")}
              </span>
            </div>
          )}
        </>
      ) : null}

      <button
        onClick={generateQR}
        disabled={loading}
        className="flex items-center gap-1.5 text-xs font-semibold tracking-wide disabled:opacity-50 transition-opacity hover:opacity-70"
        style={{ color: "var(--primary)" }}
      >
        <RefreshCw size={12} />
        更新する
      </button>
    </div>
  );
}
