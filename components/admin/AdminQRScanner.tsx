"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type Status = "loading" | "scanning" | "processing" | "error";
type QrPayload = { type: "store_checkin" | "user_receive"; token?: string };

export function AdminQRScanner() {
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

        const qr = new Html5Qrcode("admin-qr-scanner-el");
        qrRef.current = qr;

        await qr.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          async (decoded) => {
            if (processingRef.current) return;
            processingRef.current = true;
            setStatus("processing");

            try {
              const payload: QrPayload = JSON.parse(decoded);

              if (payload.type === "user_receive" && payload.token) {
                const res = await fetch("/api/admin/resolve-token", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ token: payload.token }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);
                router.push(`/admin/customers/${data.userId}`);
              } else {
                throw new Error("顧客のマイQRコードをスキャンしてください");
              }
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "読み取りエラー");
              processingRef.current = false;
              setStatus("scanning");
            }
          },
          () => {}
        );

        if (!unmounted) setStatus("scanning");
      } catch (e) {
        if (unmounted) return;
        const msg = e instanceof Error ? e.message : "";
        if (msg.toLowerCase().includes("permission") || msg.toLowerCase().includes("notallowed")) {
          setErrorMsg("カメラの使用を許可してください。");
        } else {
          setErrorMsg("カメラを起動できませんでした。");
        }
        setStatus("error");
      }
    }

    start();

    return () => {
      unmounted = true;
      const qr = qrRef.current;
      if (qr) {
        qr.stop().catch(() => {}).finally(() => { try { qr.clear(); } catch {} });
      }
    };
  }, [router]);

  return (
    <div className="rounded-2xl border border-border overflow-hidden bg-card">
      <div className="relative bg-black" style={{ minHeight: 300 }}>
        <div id="admin-qr-scanner-el" className="w-full" />

        {status === "loading" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: "var(--primary)", borderTopColor: "transparent" }} />
            <p className="text-xs text-white/50">カメラ起動中...</p>
          </div>
        )}

        {status === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6">
            <p className="text-xs text-white/60 text-center">{errorMsg}</p>
            <button
              onClick={() => { setStatus("loading"); setErrorMsg(""); }}
              className="px-4 py-1.5 rounded-full text-xs font-bold text-white"
              style={{ background: "var(--primary)" }}
            >
              再試行
            </button>
          </div>
        )}

        {status === "processing" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <p className="text-sm text-white font-medium">処理中...</p>
          </div>
        )}

        {status === "scanning" && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="relative w-52 h-52">
              <span className="absolute top-0 left-0 w-6 h-6 border-t-[3px] border-l-[3px] rounded-tl-sm" style={{ borderColor: "var(--primary)" }} />
              <span className="absolute top-0 right-0 w-6 h-6 border-t-[3px] border-r-[3px] rounded-tr-sm" style={{ borderColor: "var(--primary)" }} />
              <span className="absolute bottom-0 left-0 w-6 h-6 border-b-[3px] border-l-[3px] rounded-bl-sm" style={{ borderColor: "var(--primary)" }} />
              <span className="absolute bottom-0 right-0 w-6 h-6 border-b-[3px] border-r-[3px] rounded-br-sm" style={{ borderColor: "var(--primary)" }} />
              <div className="absolute left-2 right-2 h-px opacity-60"
                style={{ background: "var(--primary)", top: "50%", animation: "scanLine 2s ease-in-out infinite" }} />
            </div>
          </div>
        )}
      </div>

      {status === "scanning" && (
        <p className="text-center text-xs text-muted-foreground py-3">
          顧客のマイQRコードをフレーム内に合わせてください
        </p>
      )}

      <style>{`
        #admin-qr-scanner-el video { width:100%!important; height:100%!important; object-fit:cover!important; }
        #admin-qr-scanner-el img { display:none!important; }
        #admin-qr-scanner-el > div { border:none!important; padding:0!important; }
        @keyframes scanLine {
          0%,100% { transform:translateY(-60px); opacity:0.3; }
          50%      { transform:translateY(60px);  opacity:0.8; }
        }
      `}</style>
    </div>
  );
}
