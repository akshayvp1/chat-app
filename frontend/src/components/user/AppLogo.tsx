import { cn } from "@/lib/utils";

interface AppLogoProps {
  className?: string;
  imgClassName?: string;
}

export default function AppLogo({ className, imgClassName }: AppLogoProps) {
  return (
    <img
      src="/olam.png"
      alt="Olam"
      className={cn("h-auto w-auto object-contain", className, imgClassName)}
    />
  );
}
