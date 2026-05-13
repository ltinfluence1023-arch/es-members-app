const COLORS = [
  "#e03a3a", "#c0392b", "#9b59b6", "#8e44ad",
  "#2980b9", "#16a085", "#d35400", "#e91e63",
];

export function getAvatarColor(userId: string): string {
  const hash = userId.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
  return COLORS[hash % COLORS.length];
}

export function getAvatarUrl(userId: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${userId}`;
}
