"use client";

import { useState } from "react";
import { getAvatarColor, getAvatarUrl } from "@/lib/utils/avatar";

interface Props {
  userId: string;
  nickname: string;
  size?: number;
  className?: string;
}

export function AvatarImage({ userId, nickname, size = 40, className = "" }: Props) {
  const [failed, setFailed] = useState(false);
  const color = getAvatarColor(userId);
  const initial = (nickname || "?").charAt(0).toUpperCase();

  return (
    <div
      className={`rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 ${className}`}
      style={{ width: size, height: size, background: color }}
    >
      {!failed ? (
        <img
          src={getAvatarUrl(userId)}
          alt={nickname}
          width={size}
          height={size}
          className="w-full h-full object-cover"
          onError={() => setFailed(true)}
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
