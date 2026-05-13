"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getCurrentPosition } from "@/lib/utils/getCurrentPosition";

type QrPayload = { type: "store_checkin" | "user_receive"; token?: string };

export default function ScanPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"scanning" | "processing">("scanning");
  const [error, setError] = useState<string>("");
  const processingRef = useRef(false);

  useEffect(() => {
    let scanner: { clear: () => void; render: (success: (text: string) => void, error: () => void) => void } | null = null;

    async function startScanner() {
      const { Html5QrcodeScanner } = await import("html5-qrcode");

      scanner = new Html5QrcodeScanner(
        "qr-reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false
      );

      scanner.render(
        async (decodedText: string) => {
          if (processingRef.current) return;
          processingRef.current = true;
          setStatus("processing");

          try {
            const payload: QrPayload = JSON.parse(decodedText);

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
          } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "エラーが発生しました";
            setError(msg);
            toast.error(msg);
            processingRef.current = false;
            setStatus("scanning");
          }
        },
        () => {}
      );
    }

    startScanner();
    return () => { scanner?.clear(); };
  }, [router]);

  return (
    <div className="px-4 py-6 space-y-4">
      <h1 className="text-lg font-semibold">QR を読み取る</h1>
      <p className="text-sm text-muted-foreground">
        店舗QRでチェックイン、または相手のマイQRで送金
      </p>

      <div id="qr-reader" className="w-full" />

      {status === "processing" && (
        <p className="text-center text-sm text-muted-foreground">処理中...</p>
      )}
      {error && (
        <p className="text-center text-sm text-destructive">{error}</p>
      )}

      <button
        onClick={() => router.back()}
        className="w-full text-sm text-muted-foreground underline"
      >
        戻る
      </button>
    </div>
  );
}
