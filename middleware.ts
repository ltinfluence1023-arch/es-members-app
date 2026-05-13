import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_CUSTOMER_PATHS = [
  "/home",
  "/ranking",
  "/coupons",
  "/notices",
  "/scan",
  "/transfer",
  "/menu",
  "/qr",
  "/history",
  "/profile",
  "/quiz",
  "/achievements",
  "/blackjack",
];

// R-701: 顧客ルートは認証済顧客のみ
// R-702: 管理ルートは admin_users 登録者のみ
export async function middleware(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // 環境変数未設定時はミドルウェアをスキップ（開発初期用）
  if (
    !supabaseUrl ||
    !supabaseAnonKey ||
    supabaseUrl.includes("placeholder") ||
    supabaseAnonKey.includes("placeholder")
  ) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // 未認証: 保護されたルートへのアクセスを適切なログインへリダイレクト
  if (!user) {
    if ((pathname === "/admin" || pathname.startsWith("/admin/"))) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/admin-login";
      return NextResponse.redirect(redirectUrl);
    }
    if (PROTECTED_CUSTOMER_PATHS.some((p) => pathname.startsWith(p))) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/login";
      return NextResponse.redirect(redirectUrl);
    }
    return supabaseResponse;
  }

  // 管理ルートへのアクセス: サービスロールキーでRLSを回避してチェック (R-702)
  if ((pathname === "/admin" || pathname.startsWith("/admin/"))) {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (serviceRoleKey && supabaseUrl) {
      const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false },
      });
      const { data: adminUser } = await adminSupabase
        .from("admin_users")
        .select("id")
        .eq("id", user.id)
        .single();

      if (!adminUser) {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = "/admin-login";
        return NextResponse.redirect(redirectUrl);
      }
    }
  }

  // 認証済みユーザーがログイン/登録/管理者ログインページにアクセスした場合
  if (pathname === "/login" || pathname === "/signup") {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/home";
    return NextResponse.redirect(redirectUrl);
  }
  if (pathname === "/admin-login") {
    // Already authenticated — check if admin and route accordingly
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (serviceRoleKey && supabaseUrl) {
      const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false },
      });
      const { data: adminUser } = await adminSupabase
        .from("admin_users")
        .select("id")
        .eq("id", user.id)
        .single();
      if (adminUser) {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = "/admin";
        return NextResponse.redirect(redirectUrl);
      }
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
