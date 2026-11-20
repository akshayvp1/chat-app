const BRAND_COLOR = "#8065E8";

export default function OtpSuccess() {
  return (
    <div className="flex flex-col items-center gap-3 py-2 text-center">
      <svg
        width="42"
        height="42"
        viewBox="0 0 24 24"
        fill="none"
        stroke={BRAND_COLOR}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
      <p className="text-lg font-extrabold text-foreground">Verified!</p>
      <p className="text-sm text-muted-foreground">Redirecting to your chats...</p>
    </div>
  );
}
