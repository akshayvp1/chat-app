import { useEffect, useState } from "react";
import { PhoneIncoming, PhoneOutgoing, PhoneMissed, X } from "lucide-react";
import callService, { CallLogEntry } from "@/services/user/callService";

const BRAND_COLOR = "#8065E8";

interface CallHistoryModalProps {
  currentUserId: string;
  refreshKey: number;
  onClose: () => void;
}

export default function CallHistoryModal({
  currentUserId,
  refreshKey,
  onClose,
}: CallHistoryModalProps) {
  const [state, setState] = useState<{
    refreshKey: number;
    loading: boolean;
    history: CallLogEntry[];
  }>({
    refreshKey,
    loading: true,
    history: [],
  });

  const isCurrent = state.refreshKey === refreshKey;
  const loading = isCurrent ? state.loading : true;
  const history = isCurrent ? state.history : [];

  useEffect(() => {
    let cancelled = false;

    callService.getHistory().then((res) => {
      if (cancelled) return;
      setState({
        refreshKey,
        loading: false,
        history: res.success && res.data ? res.data : [],
      });
    });

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  function getName(party: CallLogEntry["callerId"]): string {
    if (typeof party === "string") return party;
    return party?.name ?? "Unknown";
  }

  function getId(party: CallLogEntry["callerId"]): string {
    if (typeof party === "string") return party;
    return party?._id ?? "";
  }

  function formatDuration(seconds?: number): string {
    if (!seconds) return "";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4">
      <div className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-md flex-col rounded-2xl border border-border bg-card shadow-xl sm:max-h-[calc(100dvh-2rem)]" role="dialog" aria-modal="true" aria-labelledby="call-history-title">
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-4 sm:px-5 dark:border-border">
          <p id="call-history-title" className="text-lg font-extrabold text-foreground">Call History</p>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            title="Close call history"
            aria-label="Close call history"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-2">
          {loading ? (
            <p className="mt-10 text-center text-sm text-muted-foreground">Loading...</p>
          ) : history.length === 0 ? (
            <p className="mt-10 text-center text-sm text-muted-foreground">No calls yet</p>
          ) : (
            history.map((entry) => {
              const isOutgoing = getId(entry.callerId) === currentUserId;
              const otherParty = isOutgoing ? entry.receiverId : entry.callerId;
              const label = getName(otherParty);

              const Icon =
                entry.status === "missed" || entry.status === "rejected"
                  ? PhoneMissed
                  : isOutgoing
                  ? PhoneOutgoing
                  : PhoneIncoming;

              const iconColor =
                entry.status === "missed" || entry.status === "rejected"
                  ? "#ef4444"
                  : BRAND_COLOR;

              return (
                <div
                  key={entry._id}
                  className="flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-muted"
                >
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                    style={{ backgroundColor: `${iconColor}20` }}
                  >
                    <Icon className="h-4 w-4" style={{ color: iconColor }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{label}</p>
                    <p className="truncate text-xs capitalize text-muted-foreground">
                      {entry.type} · {entry.status}
                      {entry.duration ? ` · ${formatDuration(entry.duration)}` : ""}
                    </p>
                  </div>
                  <p className="hidden shrink-0 text-xs tabular-nums text-muted-foreground sm:block">
                    {new Date(entry.startedAt).toLocaleString([], {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}