import { redirect } from "next/navigation";

// ルートは /home へリダイレクト (middleware で認証チェック)
export default function RootPage() {
  redirect("/home");
}
