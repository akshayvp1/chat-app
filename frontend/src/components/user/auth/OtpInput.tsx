import type { ClipboardEvent, KeyboardEvent, RefObject } from "react";
import { OTP_LENGTH } from "../../../utils/validation";

interface OtpInputProps {
  digits: string[];
  error: string;
  isLoading: boolean;
  inputRefs: RefObject<(HTMLInputElement | null)[]>;
  onChange: (index: number, value: string) => void;
  onKeyDown: (index: number, e: KeyboardEvent<HTMLInputElement>) => void;
  onPaste: (e: ClipboardEvent<HTMLInputElement>) => void;
}

export default function OtpInput({
  digits,
  error,
  isLoading,
  inputRefs,
  onChange,
  onKeyDown,
  onPaste,
}: OtpInputProps) {
  return (
    <div className="flex justify-center gap-2 mb-4">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            inputRefs.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          autoFocus={index === 0}
          maxLength={1}
          disabled={isLoading}
          value={digit}
          onChange={(e) => onChange(index, e.target.value)}
          onKeyDown={(e) => onKeyDown(index, e)}
          onPaste={onPaste}
          aria-label={`Digit ${index + 1} of ${OTP_LENGTH}`}
          className={`h-12 w-11 rounded-xl border-[1.5px] bg-muted/60 text-center text-lg font-bold text-foreground outline-none transition-colors focus:border-[#8065E8] focus:ring-2 focus:ring-[#8065E8]/20 disabled:opacity-60 ${
            error
              ? "border-red-500 bg-red-50 dark:bg-red-500/10"
              : "border-border"
          }`}
        />
      ))}
    </div>
  );
}
