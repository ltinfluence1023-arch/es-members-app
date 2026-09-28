/**
 * 管理アカウントの権限ごとに利用できる画面・API。
 * proxy（middleware.ts）でページと /api/admin/* の両方に適用する。
 *
 *   admin  = マスター  : 全機能
 *   staff  = スタッフ  : 当日のチェックイン情報・自身のアカウント（PW変更）
 *   dealer = ディーラー: スタッフ + ポーカー業務
 */
export type AdminRole = "admin" | "staff" | "dealer";

export const ROLE_LABEL: Record<AdminRole, string> = {
  admin: "マスター",
  staff: "スタッフ",
  dealer: "ディーラー",
};

const STAFF_PATHS = [
  "/admin/checkins",
  "/admin/account",
  "/api/admin/checkins",
  "/api/admin/me",
  "/api/admin/verify",
];

const DEALER_PATHS = [
  ...STAFF_PATHS,
  "/admin/poker",
  "/api/admin/poker", // 卓の追加・変更は API 側でマスターのみに制限
];

const ALLOWED_PATHS: Record<Exclude<AdminRole, "admin">, string[]> = {
  staff: STAFF_PATHS,
  dealer: DEALER_PATHS,
};

function matches(pathname: string, base: string): boolean {
  return pathname === base || pathname.startsWith(base + "/");
}

export function canAccessAdminPath(role: AdminRole, pathname: string): boolean {
  if (role === "admin") return true;
  return ALLOWED_PATHS[role].some((base) => matches(pathname, base));
}

/** ログイン後・権限外アクセス時の遷移先 */
export function adminHomePath(role: AdminRole): string {
  if (role === "admin") return "/admin/customers";
  if (role === "dealer") return "/admin/poker";
  return "/admin/checkins";
}
