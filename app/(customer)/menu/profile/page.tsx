"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { getAvatarColor, getAvatarUrl } from "@/lib/utils/avatar";
import { Camera, ChevronLeft } from "lucide-react";
import Link from "next/link";

const schema = z.object({
  nickname: z.string().min(1, "ニックネームを入力してください").max(20, "20文字以内"),
  bio: z.string().max(200, "200文字以内").optional(),
});
type FormData = z.infer<typeof schema>;

interface ProfileData {
  id: string;
  nickname: string;
  chip_balance: number;
  point_balance: number;
  total_visit_count: number;
  avatar_url: string | null;
}

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [avatarBust, setAvatarBust] = useState(Date.now());
  const [imgFailed, setImgFailed] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push("/login"); return; }
      const { data } = await supabase
        .from("users")
        .select("id, nickname, chip_balance, point_balance, total_visit_count, avatar_url")
        .eq("id", user.id)
        .single();
      if (data) {
        setProfile(data);
        reset({
          nickname: data.nickname,
          bio: (user.user_metadata?.bio as string) ?? "",
        });
      }
      setLoading(false);
    });
  }, [router, reset]);

  async function onSubmit(values: FormData) {
    setSaving(true);
    try {
      const res = await fetch("/api/profile/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname: values.nickname, bio: values.bio ?? "" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setProfile((p) => p ? { ...p, nickname: values.nickname } : p);
      toast.success("プロフィールを更新しました");
      router.refresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("2MB以内の画像を選択してください");
      return;
    }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/profile/avatar", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      // avatar_url をアップロード後の URL に更新してキャッシュバスト
      setProfile(p => p ? { ...p, avatar_url: data.url } : p);
      setImgFailed(false);
      setAvatarBust(Date.now());
      toast.success("プロフィール画像を更新しました");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "画像のアップロードに失敗しました");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  if (loading || !profile) {
    return <div className="px-4 py-10 text-center text-sm text-muted-foreground">読み込み中...</div>;
  }

  const color = getAvatarColor(profile.id);
  const initial = (profile.nickname || "?").charAt(0).toUpperCase();
  // avatar_url 優先（LINE アイコン or アップロード済み画像）、なければ Supabase Storage
  const avatarSrc = profile.avatar_url
    ? `${profile.avatar_url}${profile.avatar_url.includes("?") ? "&" : "?"}v=${avatarBust}`
    : `${getAvatarUrl(profile.id)}?v=${avatarBust}`;

  return (
    <div className="px-4 py-5 space-y-5 animate-page-in">

      <Link
        href="/menu"
        className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors interactive"
      >
        <ChevronLeft size={14} />
        メニュー
      </Link>

      {/* Avatar */}
      <div className="flex flex-col items-center gap-3 pt-2">
        <div className="relative">
          <div
            className="w-24 h-24 rounded-full overflow-hidden flex items-center justify-center ring-4 ring-border"
            style={{ background: color }}
          >
            {!imgFailed ? (
              <img
                src={avatarSrc}
                alt={profile.nickname}
                className="w-full h-full object-cover"
                onError={() => setImgFailed(true)}
              />
            ) : (
              <span className="text-3xl font-black text-white">{initial}</span>
            )}
          </div>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center interactive shadow-lg"
            style={{ background: "var(--primary)" }}
          >
            {uploading ? (
              <div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
            ) : (
              <Camera size={14} className="text-white" />
            )}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarChange}
          />
        </div>
        <div className="text-center">
          <p className="text-lg font-black">{profile.nickname}</p>
          <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
            ID: {profile.id.slice(0, 8).toUpperCase()}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Chip",  value: profile.chip_balance.toLocaleString() },
          { label: "PT",    value: profile.point_balance.toLocaleString() },
          { label: "Visit", value: profile.total_visit_count.toLocaleString() },
        ].map(({ label, value }) => (
          <div key={label} className="card-elevated rounded-2xl p-4 text-center">
            <p className="text-[9px] font-black tracking-[0.2em] uppercase text-muted-foreground mb-1">{label}</p>
            <p className="text-xl font-black text-white/90 tabular-nums">{value}</p>
          </div>
        ))}
      </div>

      {/* Edit form */}
      <div className="card-elevated rounded-2xl p-5 space-y-4">
        <p className="text-[10px] font-black tracking-[0.22em] uppercase text-muted-foreground">プロフィール編集</p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-muted-foreground tracking-wide uppercase">
              ニックネーム
            </label>
            <input
              {...register("nickname")}
              className="w-full rounded-xl border border-border bg-background/60 px-4 py-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-primary/60 transition-all"
            />
            {errors.nickname && (
              <p className="text-xs" style={{ color: "var(--destructive)" }}>{errors.nickname.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-muted-foreground tracking-wide uppercase">
              自己紹介
            </label>
            <textarea
              {...register("bio")}
              rows={3}
              placeholder="自己紹介を入力してください（200文字以内）"
              className="w-full rounded-xl border border-border bg-background/60 px-4 py-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-primary/60 transition-all resize-none placeholder:text-muted-foreground/50"
            />
            {errors.bio && (
              <p className="text-xs" style={{ color: "var(--destructive)" }}>{errors.bio.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl py-3.5 font-bold text-[15px] text-white interactive disabled:opacity-50"
            style={{ background: "var(--primary)" }}
          >
            {saving ? "保存中..." : "保存する"}
          </button>
        </form>
      </div>
    </div>
  );
}
