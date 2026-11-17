import React, { useEffect, useState } from "react";
import { PhoneIncoming, PhoneOutgoing, PhoneMissed, X } from "lucide-react";
import callService, { CallLogEntry } from "@/services/user/callService";

const BRAND_COLOR = "#5b7cfa";

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
  const [history, setHistory] = useState<CallLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    callService.getHistory().then((res) => {
      if (cancelled) return;
      if (res.success && res.data) setHistory(res.data);
      setLoading(false);
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
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <p className="text-lg font-extrabold text-slate-900">Call History</p>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-2">
          {loading ? (
            <p className="text-sm text-gray-400 text-center mt-10">Loading...</p>
          ) : history.length === 0 ? (
            <p className="text-sm text-gray-400 text-center mt-10">No calls yet</p>
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
                  className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-slate-50"
                >
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${iconColor}20` }}
                  >
                    <Icon className="h-4 w-4" style={{ color: iconColor }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800">{label}</p>
                    <p className="text-xs text-gray-400 capitalize">
                      {entry.type} · {entry.status}
                      {entry.duration ? ` · ${formatDuration(entry.duration)}` : ""}
                    </p>
                  </div>
                  <p className="text-xs text-gray-400 shrink-0">
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