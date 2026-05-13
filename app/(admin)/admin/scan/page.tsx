import { AdminQRScanner } from "@/components/admin/AdminQRScanner";

export default function AdminScanPage() {
  return (
    <div className="max-w-sm space-y-4">
      <h1 className="text-xl font-semibold">QRスキャン</h1>
      <p className="text-sm text-muted-foreground">
        顧客のマイQRコードをスキャンして、顧客詳細画面に移動します。
      </p>
      <AdminQRScanner />
    </div>
  );
}
