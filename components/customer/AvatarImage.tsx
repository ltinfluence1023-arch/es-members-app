"use client";

import { useState } from "react";
import { getAvatarColor, getAvatarUrl } from "@/lib/utils/avatar";

interface Props {
  userId: string;
  nickname: string;
  src?: string | null;   // LINE avatar_url など外部 URL を優先表示
  size?: number;
  className?: string;
}

export function AvatarImage({ userId, nickname, src, size = 40, className = "" }: Props) {
  const [primaryFailed,  setPrimaryFailed]  = useState(false);
  const [fallbackFailed, setFallbackFailed] = useState(false);

  const color   = getAvatarColor(userId);
  const initial = (nickname || "?").charAt(0).toUpperCase();

  // 表示する URL を決定
  // 1. src (LINE avatar) が有効 → 使う
  // 2. src が null/失敗 → Supabase Storage
  // 3. どちらも失敗 → イニシャル
  const primarySrc  = src && !primaryFailed  ? src                 : null;
  const fallbackSrc = !primaryFailed && !src  ? getAvatarUrl(userId)
                    : primaryFailed           ? getAvatarUrl(userId)
                    : null;
  const showImage   = primarySrc ?? (fallbackFailed ? null : fallbackSrc);

  return (
    <div
      className={`rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 ${className}`}
      style={{ width: size, height: size, background: color }}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={showImage}
          alt={nickname}
          width={size}
          height={size}
          className="w-full h-full object-cover"
          onError={() => {
            if (showImage === src) setPrimaryFailed(true);
            else setFallbackFailed(true);
          }}
        />
      ) : (
        <span
          className="font-black text-white select-none leading-none"
          style={{ fontSize: Math.round(size * 0.42) }}
        >
          {initial}
        </span>
      )}
    </div>
  );
}
