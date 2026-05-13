"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

const PAYLOAD = JSON.stringify({ type: "store_checkin" });

export function StoreQRDisplay() {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  useEffect(() => {
    QRCode.toDataURL(PAYLOAD, {
      width: 280,
      margin: 2,
      color: { dark: "#000000", light: "#ffffff" },
    }).then(setQrDataUrl);
  }, []);

  return (
    <div className="rounded-xl border border-border bg-card p-6 flex flex-col items-center gap-4">
      {qrDataUrl ? (
        <>
          <div className="rounded-lg overflow-hidden bg-white p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrDataUrl} alt="店舗チェックインQR" width={280} height={280} />
          </div>
          <p className="text-xs text-muted-foreground text-center">
            店舗ID: <span className="font-mono text-foreground">{process.env.NEXT_PUBLIC_STORE_ID ?? "main"}</span>
          </p>
        </>
      ) : (
        <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">
          生成中...
        </div>
      )}
    </div>
  );
}
