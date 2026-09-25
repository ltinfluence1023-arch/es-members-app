import { redirect } from "next/navigation";
import { FEATURES } from "@/lib/features";

// 送金機能の公開設定（lib/features.ts）
export default function TransferLayout({ children }: { children: React.ReactNode }) {
  if (!FEATURES.transfer) redirect("/home");
  return children;
}
