import { Phone, PhoneOff } from "lucide-react";

interface IncomingCallPromptProps {
  onAccept: () => void;
  onDecline: () => void;
  variant?: "direct" | "group";
}

const STYLES = {
  direct: {
    container: "mt-2 flex gap-8",
    wrapper: "flex flex-col items-center gap-2",
    label: "text-xs text-[#C9BFFF]",
    decline:
      "flex h-12 w-12 items-center justify-center rounded-full bg-red-500 transition-colors hover:bg-red-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:h-14 sm:w-14",
    accept:
      "flex h-12 w-12 items-center justify-center rounded-full bg-green-500 transition-colors hover:bg-green-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:h-14 sm:w-14",
    icon: "h-6 w-6",
    declineLabel: "Decline call",
    acceptLabel: "Accept call",
  },
  group: {
    container: "mt-2 flex items-center gap-4",
    wrapper: "",
    label: "",
    decline:
      "flex h-12 w-12 items-center justify-center rounded-full bg-red-500 text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
    accept:
      "flex h-12 w-12 items-center justify-center rounded-full bg-green-500 text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
    icon: "h-5 w-5",
    declineLabel: "Decline group call",
    acceptLabel: "Accept group call",
  },
} as const;

export default function IncomingCallPrompt({
  onAccept,
  onDecline,
  variant = "direct",
}: IncomingCallPromptProps) {
  const styles = STYLES[variant];

  const declineButton = (
    <button
      type="button"
      onClick={onDecline}
      className={styles.decline}
      title={styles.declineLabel}
      aria-label={styles.declineLabel}
    >
      <PhoneOff className={styles.icon} />
    </button>
  );

  const acceptButton = (
    <button
      type="button"
      onClick={onAccept}
      className={styles.accept}
      title={styles.acceptLabel}
      aria-label={styles.acceptLabel}
    >
      <Phone className={styles.icon} />
    </button>
  );

  if (variant === "direct") {
    return (
      <div className={styles.container}>
        <div className={styles.wrapper}>
          {declineButton}
          <span className={styles.label}>Decline</span>
        </div>
        <div className={styles.wrapper}>
          {acceptButton}
          <span className={styles.label}>Accept</span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {declineButton}
      {acceptButton}
    </div>
  );
}
