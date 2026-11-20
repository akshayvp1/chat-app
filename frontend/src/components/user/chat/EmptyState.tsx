import { Send } from "lucide-react";

import { BRAND_COLOR } from "../../../constants/brand";

export default function EmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center sm:p-8">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#EEE9FF] dark:bg-[#8065E8]/15">
        <Send
          className="h-7 w-7"
          style={{
            color: BRAND_COLOR,
          }}
        />
      </div>

      <p className="text-lg font-extrabold text-foreground">Your Messages</p>

      <p className="max-w-xs text-sm text-muted-foreground">
        Select a conversation or group to start chatting.
      </p>
    </div>
  );
}
