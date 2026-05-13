"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getCurrentPosition } from "@/lib/utils/getCurrentPosition";

type QrPayload = { type: "store_checkin" | "user_receive"; token?: string };
type Status = "loading" | "scanning" | "processing" | "error";

export function ScannerView() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const processingRef = useRef(false);
  const qrRef = useRef<import("html5-qrcode").Html5Qrcode | null>(null);

  useEffect(() => {
    let unmounted = false;

    async function start() {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (unmounted) return;

        const qr = new Html5Qrcode("qr-scanner-el");
        qrRef.current = qr;

        await qr.start(
          { facingMode: "environment" },           // 背面カメラを明示指定
          { fps: 10, qrbox: { width: 220, height: 220 } },
          async (decoded) => {
            if (processingRef.current) return;
            processingRef.current = true;
            setStatus("processing");

            try {
              const payload: QrPayload = JSON.parse(decoded);

              if (payload.type === "store_checkin") {
                toast.message("位置情報を確認中...");
                const pos = await getCurrentPosition();
                const res = await fetch("/api/checkin", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(pos),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);
                toast.success(`チェックイン！ +${data.bonus} chip / +${data.pointBonus ?? 0} pt`);
                router.push("/home");
                router.refresh();
              } else if (payload.type === "user_receive" && payload.token) {
                router.push(`/transfer/${payload.token}`);
              } else {
                throw new Error("不明なQRコードです");
              }
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "読み取りエラー");
              processingRef.current = false;
              setStatus("scanning");
            }
          },
          () => {} // フレーム単位のエラーは無視
        );

        if (!unmounted) setStatus("scanning");
      } catch (e) {
        if (unmounted) return;
        const msg = e instanceof Error ? e.message : "";
        if (msg.toLowerCase().includes("permission") || msg.toLowerCase().includes("notallowed")) {
          setErrorMsg("カメラの使用を許可してください。\nブラウザのアドレスバー横のカメラアイコンから許可できます。");
        } else if (msg.toLowerCase().includes("notfound") || msg.toLowerCase().includes("devicenotfound")) {
          setErrorMsg("カメラが見つかりません。");
        } else {
          setErrorMsg("カメラを起動できませんでした。\nHTTPSでアクセスしているか確認してください。");
        }
        setStatus("error");
      }
    }

    start();

    return () => {
      unmounted = true;
      const qr = qrRef.current;
      if (qr) {
        qr.stop()
          .catch(() => {})
          .finally(() => { try { qr.clear(); } catch {} });
      }
    };
  }, [router]);

  return (
    <div className="card-gaming rounded-2xl overflow-hidden">
      {/* カメラビュー */}
      <div className="relative bg-black" style={{ minHeight: 300 }}>

        {/* html5-qrcode がここに video を注入する */}
        <div id="qr-scanner-el" className="w-full" />

        {/* ローディング */}
        {status === "loading" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: "var(--primary)", borderTopColor: "transparent" }} />
            <p className="text-xs text-white/50">カメラ起動中...</p>
          </div>
        )}

        {/* エラー */}
        {status === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6">
            <span className="text-4xl">📷</span>
            <p className="text-xs text-white/60 text-center whitespace-pre-line leading-relaxed">
              {errorMsg}
            </p>
            <button
              onClick={() => { setStatus("loading"); setErrorMsg(""); }}
              className="mt-1 px-4 py-1.5 rounded-full text-xs font-bold interactive"
              style={{ background: "var(--primary)", color: "#fff" }}
            >
              再試行
            </button>
          </div>
        )}

        {/* 処理中 */}
        {status === "processing" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <p className="text-sm text-white font-medium">処理中...</p>
          </div>
        )}

        {/* スキャン枠オーバーレイ */}
        {status === "scanning" && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="relative w-52 h-52">
              {/* 四隅のマーカー */}
              <span className="absolute top-0 left-0 w-6 h-6 border-t-[3px] border-l-[3px] rounded-tl-sm"
                style={{ borderColor: "var(--primary)" }} />
              <span className="absolute top-0 right-0 w-6 h-6 border-t-[3px] border-r-[3px] rounded-tr-sm"
                style={{ borderColor: "var(--primary)" }} />
              <span className="absolute bottom-0 left-0 w-6 h-6 border-b-[3px] border-l-[3px] rounded-bl-sm"
                style={{ borderColor: "var(--primary)" }} />
              <span className="absolute bottom-0 right-0 w-6 h-6 border-b-[3px] border-r-[3px] rounded-br-sm"
                style={{ borderColor: "var(--primary)" }} />
              {/* スキャンライン */}
              <div className="absolute left-2 right-2 h-px opacity-60"
                style={{
                  background: "var(--primary)",
                  top: "50%",
                  animation: "scanLine 2s ease-in-out infinite",
                }} />
            </div>
          </div>
        )}
      </div>

      {status === "scanning" && (
        <p className="text-center text-[11px] text-muted-foreground py-3 tracking-wide">
          QRコードをフレーム内に合わせてください
        </p>
      )}

      <style>{`
        #qr-scanner-el video {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
        }
        #qr-scanner-el img { display: none !important; }
        #qr-scanner-el > div { border: none !important; padding: 0 !important; }
        @keyframes scanLine {
          0%, 100% { transform: translateY(-60px); opacity: 0.3; }
          50%       { transform: translateY(60px);  opacity: 0.8; }
        }
      `}</style>
    </div>
  );
}
