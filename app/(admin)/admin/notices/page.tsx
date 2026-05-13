import { createAdminClient } from "@/lib/supabase/admin";
import { AdminNoticeForm } from "@/components/admin/AdminNoticeForm";

export default async function AdminNoticesPage() {
  const adminClient = createAdminClient();

  const { data: notices } = await adminClient
    .from("notices")
    .select("id, title, is_published, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">お知らせ管理</h1>

      <AdminNoticeForm />

      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="py-2 px-4 text-left text-xs text-muted-foreground">タイトル</th>
              <th className="py-2 px-4 text-left text-xs text-muted-foreground">状態</th>
              <th className="py-2 px-4 text-left text-xs text-muted-foreground">作成日</th>
            </tr>
          </thead>
          <tbody>
            {(notices ?? []).map((n) => (
              <tr key={n.id} className="border-b border-border last:border-0">
                <td className="py-3 px-4 font-medium">{n.title}</td>
                <td className="py-3 px-4">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    n.is_published ? "bg-green-500/20 text-green-400" : "bg-muted text-muted-foreground"
                  }`}>
                    {n.is_published ? "公開" : "非公開"}
                  </span>
                </td>
                <td className="py-3 px-4 text-xs text-muted-foreground">
                  {new Date(n.created_at).toLocaleDateString("ja-JP")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
