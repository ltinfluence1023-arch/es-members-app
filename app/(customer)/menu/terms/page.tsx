import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="px-4 py-6 space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/home" className="text-xs text-muted-foreground hover:underline">← ホーム</Link>
        <h1 className="text-lg font-semibold">利用規約</h1>
      </div>
      <div className="rounded-xl border border-border bg-card p-4 text-sm leading-relaxed space-y-4">
        <p>このアプリをご利用いただくにあたり、以下の利用規約にご同意いただく必要があります。</p>
        <p>チップおよびポイントは当店サービス内でのみ有効であり、現金への換金は一切できません。</p>
        <p>不正な取引や規約違反が確認された場合、アカウントを停止する場合があります。</p>
        <p>サービス内容は予告なく変更される場合があります。</p>
      </div>
    </div>
  );
}
