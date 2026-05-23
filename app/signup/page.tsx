import { redirect } from "next/navigation";

// LINE ログインに一本化したため /signup は /login にリダイレクト
export default function SignupPage() {
  redirect("/login");
}
