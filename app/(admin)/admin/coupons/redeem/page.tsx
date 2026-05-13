import { AdminCouponRedeem } from "@/components/admin/AdminCouponRedeem";

export default function AdminCouponRedeemPage() {
  return (
    <div className="space-y-6 max-w-lg">
      <h1 className="text-xl font-semibold">クーポン使用処理</h1>
      <p className="text-sm text-muted-foreground">クーポンIDを入力して使用済みにします。</p>
      <AdminCouponRedeem />
    </div>
  );
}
