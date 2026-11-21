import type { ReactNode } from "react";
import { History, LogOut, MoreVertical } from "lucide-react";

import { Button } from "@/components/ui/button";
import AppLogo from "../AppLogo";

interface SidebarHeaderProps {
  showSettingsMenu: boolean;
  settingsMenu: ReactNode;
  onOpenCallHistory: () => void;
  onOpenLogoutConfirm: () => void;
  onToggleSettings: () => void;
}

export default function SidebarHeader({
  showSettingsMenu,
  settingsMenu,
  onOpenCallHistory,
  onOpenLogoutConfirm,
  onToggleSettings,
}: SidebarHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-3 sm:px-4 sm:py-4 dark:border-border">
      <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
        <AppLogo className="h-9 shrink-0 sm:h-10" />
        <span className="truncate text-base font-extrabold uppercase leading-none tracking-[0.12em] text-foreground sm:text-lg">
          OLAM
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={onOpenCallHistory}
          className="text-muted-foreground hover:text-foreground"
          title="Call history"
          aria-label="Call history"
        >
          <History className="h-5 w-5" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={onOpenLogoutConfirm}
          className="text-muted-foreground hover:text-foreground"
          title="Log out"
          aria-label="Log out"
        >
          <LogOut className="h-5 w-5" />
        </Button>

        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground"
            onClick={onToggleSettings}
            title="Settings"
            aria-label="Settings"
            aria-expanded={showSettingsMenu}
          >
            <MoreVertical className="h-5 w-5" />
          </Button>

          {showSettingsMenu && settingsMenu}
        </div>
      </div>
    </div>
  );
}