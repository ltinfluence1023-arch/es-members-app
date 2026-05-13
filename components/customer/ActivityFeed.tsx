import { AvatarImage } from "./AvatarImage";

export type ActivityEvent = {
  type: "checkin" | "quiz" | "achievement";
  userId: string;
  nickname: string;
  avatarUrl: string | null;
  detail: string;
  timestamp: string;
};

const EVENT_META: Record<ActivityEvent["type"], { emoji: string; color: string }> = {
  checkin:     { emoji: "🍷", color: "#4ade80" },
  quiz:        { emoji: "🧠", color: "#facc15" },
  achievement: { emoji: "🏆", color: "#fb923c" },
};

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("ja-JP", {
    timeZone: "Asia/Tokyo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function ActivityFeed({ events }: { events: ActivityEvent[] }) {
  return (
    <div className="space-y-2.5">
      <p className="label-gaming">today&apos;s activity</p>

      {events.length === 0 ? (
        <div
          className="card-elevated rounded-xl px-4 py-5 text-center text-xs text-muted-foreground"
        >
          まだアクティビティがありません
        </div>
      ) : (
        <div className="card-elevated rounded-xl overflow-hidden divide-y divide-border">
          {events.map((e, i) => {
            const meta = EVENT_META[e.type];
            return (
              <div key={i} className="flex items-center gap-3 px-3.5 py-2.5">
                {/* アバター */}
                <div className="relative flex-shrink-0">
                  <AvatarImage userId={e.userId} nickname={e.nickname} size={36} />
                  {/* イベント種別バッジ */}
                  <span
                    className="absolute -bottom-0.5 -right-0.5 text-[11px] leading-none"
                    style={{ filter: `drop-shadow(0 0 4px ${meta.color}90)` }}
                  >
                    {meta.emoji}
                  </span>
                </div>

                {/* テキスト */}
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold leading-tight truncate">
                    <span style={{ color: "white" }}>{e.nickname}</span>
                    <span className="text-muted-foreground font-normal">さん</span>
                  </p>
                  <p className="text-[11px] leading-tight mt-0.5" style={{ color: meta.color }}>
                    {e.detail}
                  </p>
                </div>

                {/* 時刻 */}
                <span className="text-[10px] font-mono text-muted-foreground flex-shrink-0">
                  {fmtTime(e.timestamp)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
