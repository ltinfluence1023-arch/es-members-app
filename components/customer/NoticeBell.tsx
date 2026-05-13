"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Bell } from "lucide-react";

const STORAGE_KEY = "read_notice_ids";

interface Props {
  noticeIds: string[];
}

function getReadIds(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function markAllRead(ids: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {}
}

export function NoticeBell({ noticeIds }: Props) {
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    const readIds = getReadIds();
    const count = noticeIds.filter((id) => !readIds.has(id)).length;
    setUnread(count);
  }, [noticeIds]);

  // When on /notices, mark all as read
  useEffect(() => {
    if (pathname === "/notices") {
      markAllRead(noticeIds);
      setUnread(0);
    }
  }, [pathname, noticeIds]);

  return (
    <Link
      href="/notices"
      aria-label="お知らせ"
      className="relative rounded-lg p-2 text-muted-foreground hover:text-foreground transition-colors interactive"
    >
      <Bell size={20} />
      {unread > 0 && (
        <span
          className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px] font-black text-white"
          style={{ background: "var(--primary)" }}
        >
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );
}
