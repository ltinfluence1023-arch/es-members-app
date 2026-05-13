import { StoreQRDisplay } from "@/components/admin/StoreQRDisplay";

export default function StoreQRPage() {
  return (
    <div className="space-y-4 max-w-sm">
      <h1 className="text-xl font-semibold">店舗チェックインQR</h1>
      <p className="text-sm text-muted-foreground">
        このQRコードをお客様に読み取っていただくとチェックインが完了します。
      </p>
      <StoreQRDisplay />
    </div>
  );
}
