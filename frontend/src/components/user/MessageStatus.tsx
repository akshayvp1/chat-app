import { Check, CheckCheck, Clock } from "lucide-react";
import type { MessageDeliveryStatus } from "../../types/types";

export default function MessageStatus({
  status,
}: {
  status?: MessageDeliveryStatus;
}) {
  if (status === "sending") {
    return (
      <Clock
        className="h-3.5 w-3.5 shrink-0 text-white/70"
        role="img"
        aria-label="Sending"
      />
    );
  }

  if (status === "read") {
    return (
      <CheckCheck
        className="h-3.5 w-3.5 shrink-0 text-sky-100"
        role="img"
        aria-label="Read"
      />
    );
  }

  if (status === "delivered") {
    return (
      <CheckCheck
        className="h-3.5 w-3.5 shrink-0 text-white/80"
        role="img"
        aria-label="Delivered"
      />
    );
  }

  if (status === "sent") {
    return (
      <Check
        className="h-3.5 w-3.5 shrink-0 text-white/80"
        role="img"
        aria-label="Sent"
      />
    );
  }

  return null;
}
