import { redirect } from "next/navigation";
import { FEATURES } from "@/lib/features";

// アチーブメントの公開設定（lib/features.ts）
export default function AchievementsLayout({ children }: { children: React.ReactNode }) {
  if (!FEATURES.achievements) redirect("/home");
  return children;
}
