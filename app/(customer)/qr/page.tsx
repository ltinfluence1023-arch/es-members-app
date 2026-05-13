"use client";

import { useState } from "react";
import { MyQRCode } from "@/components/customer/MyQRCode";
import { ScannerView } from "@/components/customer/ScannerView";

type Tab = "myqr" | "scan";

export default function QRPage() {
  const [tab, setTab] = useState<Tab>("myqr");

  return (
    <div className="px-4 py-4 space-y-3 animate-page-in">
      {/* Tab switcher */}
      <div className="flex rounded-xl overflow-hidden border border-border">
        <button
          onClick={() => setTab("myqr")}
          className={`flex-1 py-2 text-xs font-bold tracking-wide transition-colors interactive ${
            tab === "myqr" ? "text-black" : "text-muted-foreground"
          }`}
          style={tab === "myqr" ? { background: "var(--primary)" } : undefined}
        >
          マイQR
        </button>
        <button
          onClick={() => setTab("scan")}
          className={`flex-1 py-2 text-xs font-bold tracking-wide transition-colors interactive ${
            tab === "scan" ? "text-black" : "text-muted-foreground"
          }`}
          style={tab === "scan" ? { background: "var(--primary)" } : undefined}
        >
          スキャン
        </button>
      </div>

      {/* Content */}
      {tab === "myqr" && (
        <div className="space-y-2 animate-slide-up">
          <p className="label-gaming">My QR Code — 受取用</p>
          <MyQRCode />
        </div>
      )}

      {tab === "scan" && (
        <div className="space-y-2 animate-slide-up">
          <p className="label-gaming">Scan — QR読み取り</p>
          <ScannerView />
        </div>
      )}
    </div>
  );
}
