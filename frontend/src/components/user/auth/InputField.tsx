import type { ChangeEvent } from "react";
import { Mail, Phone, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { InputFieldProps } from "../../../types/types";

export default function InputField({
  label,
  type,
  icon,
  value,
  error,
  maxLength,
  onChange,
}: InputFieldProps) {
  const Icon = icon === "user" ? User : icon === "mail" ? Mail : Phone;
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-muted-foreground">{label}</Label>
      <div className="relative">
        <Input
          type={type}
          value={value}
          maxLength={maxLength}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
          className={`pr-9 bg-muted/60 ${error ? "border-red-500 bg-red-50" : ""}`}
        />
        <Icon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70 pointer-events-none" />
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
