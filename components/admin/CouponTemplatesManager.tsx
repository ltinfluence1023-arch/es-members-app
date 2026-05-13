"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Edit, Trash2, X, Image as ImageIcon, Eye, EyeOff } from "lucide-react";

interface Template {
  id: string;
  name: string;
  subtitle: string | null;
  description: string | null;
  notice: string | null;
  image_url: string | null;
  point_cost: number | null;
  valid_days: number;
  max_issuance: number | null;
  is_active: boolean;
  created_at: string;
}

export function CouponTemplatesManager({ initialTemplates }: { initialTemplates: Template[] }) {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>(initialTemplates);
  const [editing, setEditing] = useState<Template | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  async function refresh() {
    const res = await fetch("/api/admin/coupon-templates");
    if (res.ok) {
      const json = await res.json();
      setTemplates(json.templates);
    }
    router.refresh();
  }

  async function toggleActive(t: Template) {
    const res = await fetch(`/api/admin/coupon-templates/${t.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !t.is_active }),
    });
    const data = await res.json();
    if (!res.ok) { toast.error(data.error ?? "失敗"); return; }
    toast.success(t.is_active ? "非公開にしました" : "公開しました");
    refresh();
  }

  async function deleteTpl(t: Template) {
    // First, fetch usage count to warn the user
    let total = 0;
    let unused = 0;
    try {
      const usageRes = await fetch(`/api/admin/coupon-templates/${t.id}/usage`);
      if (usageRes.ok) {
        const usage = await usageRes.json();
        total = usage.total ?? 0;
        unused = usage.unused ?? 0;
      }
    } catch {
      // ignore — fall through to confirm
    }

    let msg = `「${t.name}」を削除しますか？`;
    if (total > 0) {
      msg += `\n\n⚠ このテンプレートで発行された ${total} 件のクーポン`;
      if (unused > 0) msg += `（うち未使用 ${unused} 件）`;
      msg += `も同時に削除されます。\n\nこの操作は取り消せません。`;
    }

    if (!confirm(msg)) return;

    const res = await fetch(`/api/admin/coupon-templates/${t.id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) { toast.error(data.error ?? "削除失敗"); return; }
    toast.success(
      data.deletedCoupons
        ? `削除しました（クーポン ${data.deletedCoupons} 件も削除）`
        : "削除しました"
    );
    refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{templates.length} 件</p>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-bold text-white interactive"
          style={{ background: "var(--primary)" }}
        >
          <Plus size={14} />
          新規作成
        </button>
      </div>

      {templates.length === 0 ? (
        <div className="rounded-xl border border-border p-8 text-center text-sm text-muted-foreground">
          テンプレートがありません
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="py-2 px-3 text-left text-[11px] text-muted-foreground font-medium w-14"></th>
                <th className="py-2 px-3 text-left text-[11px] text-muted-foreground font-medium">タイトル</th>
                <th className="py-2 px-3 text-right text-[11px] text-muted-foreground font-medium hidden md:table-cell">有効日数</th>
                <th className="py-2 px-3 text-right text-[11px] text-muted-foreground font-medium hidden md:table-cell">必要pt</th>
                <th className="py-2 px-3 text-right text-[11px] text-muted-foreground font-medium hidden lg:table-cell">上限</th>
                <th className="py-2 px-3 text-left text-[11px] text-muted-foreground font-medium">状態</th>
                <th className="py-2 px-3 text-right text-[11px] text-muted-foreground font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {templates.map((t) => (
                <tr
                  key={t.id}
                  className="border-b border-border last:border-0 hover:bg-muted/20"
                  style={{ opacity: t.is_active ? 1 : 0.55 }}
                >
                  <td className="py-2 px-3">
                    <div className="w-10 h-10 rounded-md overflow-hidden bg-muted/40 flex items-center justify-center">
                      {t.image_url ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={t.image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon size={14} className="text-muted-foreground" />
                      )}
                    </div>
                  </td>
                  <td className="py-2 px-3">
                    <p className="text-[14px] font-semibold leading-tight">{t.name}</p>
                    {t.subtitle && (
                      <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">{t.subtitle}</p>
                    )}
                  </td>
                  <td className="py-2 px-3 text-right text-xs text-muted-foreground hidden md:table-cell whitespace-nowrap">
                    {t.valid_days}日
                  </td>
                  <td className="py-2 px-3 text-right text-xs text-muted-foreground hidden md:table-cell whitespace-nowrap font-mono">
                    {t.point_cost !== null ? t.point_cost.toLocaleString() : "—"}
                  </td>
                  <td className="py-2 px-3 text-right text-xs text-muted-foreground hidden lg:table-cell whitespace-nowrap">
                    {t.max_issuance ?? "∞"}
                  </td>
                  <td className="py-2 px-3 whitespace-nowrap">
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                      style={t.is_active
                        ? { background: "oklch(0.55 0.18 145 / 25%)", color: "oklch(0.85 0.18 145)" }
                        : { background: "oklch(0.20 0 0 / 60%)", color: "var(--muted-foreground)" }}
                    >
                      {t.is_active ? "公開" : "非公開"}
                    </span>
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setEditing(t)}
                        title="編集"
                        className="p-1.5 rounded hover:bg-muted/40 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => toggleActive(t)}
                        title={t.is_active ? "非公開にする" : "公開する"}
                        className="p-1.5 rounded hover:bg-muted/40 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {t.is_active ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                      <button
                        onClick={() => deleteTpl(t)}
                        title="削除"
                        className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <TemplateModal
          onClose={() => setShowCreate(false)}
          onSuccess={() => { setShowCreate(false); refresh(); }}
        />
      )}
      {editing && (
        <TemplateModal
          template={editing}
          onClose={() => setEditing(null)}
          onSuccess={() => { setEditing(null); refresh(); }}
        />
      )}
    </div>
  );
}

function TemplateModal({
  template, onClose, onSuccess,
}: {
  template?: Template; onClose: () => void; onSuccess: () => void;
}) {
  const [name, setName] = useState(template?.name ?? "");
  const [subtitle, setSubtitle] = useState(template?.subtitle ?? "");
  const [description, setDescription] = useState(template?.description ?? "");
  const [notice, setNotice] = useState(template?.notice ?? "");
  const [imageUrl, setImageUrl] = useState(template?.image_url ?? "");
  const [validDays, setValidDays] = useState(String(template?.valid_days ?? 30));
  const [pointCost, setPointCost] = useState(template?.point_cost ? String(template.point_cost) : "");
  const [maxIssuance, setMaxIssuance] = useState(template?.max_issuance ? String(template.max_issuance) : "");
  const [isActive, setIsActive] = useState(template?.is_active ?? true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleImageUpload(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/coupon-images", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "アップロード失敗"); return; }
      setImageUrl(data.url);
    } finally {
      setUploading(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { toast.error("タイトルは必須"); return; }
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        subtitle: subtitle.trim() || null,
        description: description.trim() || null,
        notice: notice.trim() || null,
        image_url: imageUrl || null,
        valid_days: parseInt(validDays, 10) || 30,
        point_cost: pointCost ? parseInt(pointCost, 10) : null,
        max_issuance: maxIssuance ? parseInt(maxIssuance, 10) : null,
        is_active: isActive,
      };
      const url = template
        ? `/api/admin/coupon-templates/${template.id}`
        : "/api/admin/coupon-templates";
      const res = await fetch(url, {
        method: template ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "保存失敗"); return; }
      toast.success(template ? "更新しました" : "作成しました");
      onSuccess();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-card border border-border p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">{template ? "テンプレート編集" : "新規テンプレート"}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
        </div>

        <form onSubmit={submit} className="space-y-3">
          {/* Image */}
          <div>
            <label className="text-xs text-muted-foreground">画像</label>
            <div className="mt-1 flex gap-2">
              <div className="w-24 h-24 rounded-lg overflow-hidden bg-muted/40 flex items-center justify-center flex-shrink-0">
                {imageUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={imageUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon size={20} className="text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 flex flex-col gap-1">
                <label className="rounded-lg border border-border bg-input px-3 py-2 text-sm cursor-pointer hover:bg-muted/40 text-center">
                  {uploading ? "アップロード中..." : "画像を選択"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
                  />
                </label>
                {imageUrl && (
                  <button
                    type="button"
                    onClick={() => setImageUrl("")}
                    className="text-xs text-muted-foreground hover:text-destructive"
                  >
                    画像を削除
                  </button>
                )}
              </div>
            </div>
          </div>

          <Field label="タイトル *" required>
            <input
              type="text" required value={name} onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm"
              placeholder="例: ドリンク1杯無料"
            />
          </Field>

          <Field label="サブタイトル">
            <input
              type="text" value={subtitle} onChange={(e) => setSubtitle(e.target.value)}
              className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm"
              placeholder="例: 平日限定 / 来店ありがとう"
            />
          </Field>

          <Field label="詳細">
            <textarea
              value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
              className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm"
              placeholder="クーポンの詳細説明"
            />
          </Field>

          <Field label="注意事項">
            <textarea
              value={notice} onChange={(e) => setNotice(e.target.value)} rows={2}
              className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm"
              placeholder="例: 他のクーポンとの併用不可"
            />
          </Field>

          <div className="grid grid-cols-3 gap-2">
            <Field label="有効日数 *">
              <input
                type="number" required min="1" value={validDays}
                onChange={(e) => setValidDays(e.target.value)}
                className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm"
              />
            </Field>
            <Field label="必要pt（交換用）">
              <input
                type="number" min="1" value={pointCost} placeholder="—"
                onChange={(e) => setPointCost(e.target.value)}
                className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm"
              />
            </Field>
            <Field label="発行上限">
              <input
                type="number" min="1" value={maxIssuance} placeholder="∞"
                onChange={(e) => setMaxIssuance(e.target.value)}
                className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm"
              />
            </Field>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            公開する
          </label>

          <div className="flex gap-2 pt-2">
            <button
              type="button" onClick={onClose}
              className="flex-1 rounded-lg py-2.5 text-sm font-bold border border-border text-muted-foreground"
            >
              キャンセル
            </button>
            <button
              type="submit" disabled={saving}
              className="flex-1 rounded-lg py-2.5 text-sm font-bold text-white interactive disabled:opacity-50"
              style={{ background: "var(--primary)" }}
            >
              {saving ? "保存中..." : template ? "更新" : "作成"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-muted-foreground">{label}{required && <span className="text-destructive ml-0.5">*</span>}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
