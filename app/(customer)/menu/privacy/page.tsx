import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="px-4 py-6 space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/home" className="text-xs text-muted-foreground hover:underline">← ホーム</Link>
        <h1 className="text-lg font-semibold">プライバシーポリシー</h1>
      </div>
      <div className="rounded-xl border border-border bg-card p-4 text-sm leading-relaxed space-y-4">
        <p>当店はお客様の個人情報を適切に管理し、第三者への提供は行いません。</p>
        <p>収集する情報はメールアドレス、ニックネーム、来店履歴、取引履歴です。</p>
        <p>これらの情報はサービス提供および顧客管理の目的にのみ使用します。</p>
        <p>アカウント削除をご希望の場合はスタッフまでお申し付けください。</p>
      </div>
    </div>
  );
}
