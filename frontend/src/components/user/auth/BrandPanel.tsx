import { Button } from "@/components/ui/button";
import AppLogo from "../AppLogo";

const BRAND_COLOR = "#8065E8";

interface BrandPanelProps {
  isLoginMode: boolean;
  onToggleMode: () => void;
}

export default function BrandPanel({ isLoginMode, onToggleMode }: BrandPanelProps) {
  return (
    <div
      className="relative flex flex-col items-center justify-center text-center px-8 py-10 sm:w-[42%] shrink-0 overflow-hidden"
      style={{ backgroundColor: BRAND_COLOR }}
    >
      <div className="absolute -top-16 -right-16 w-44 h-44 rounded-full bg-white/10" />
      <div className="absolute -bottom-12 -left-12 w-40 h-40 rounded-full bg-white/10" />

      <div className="relative z-10 mb-5 rounded-2xl bg-white px-5 py-3 shadow-sm">
        <AppLogo className="h-14" />
      </div>

      <p className="relative z-10 text-xl font-extrabold text-white mb-2">
        {isLoginMode ? "Hello, Welcome!" : "Welcome Back!"}
      </p>
      <p className="relative z-10 text-sm text-white/80 mb-6">
        {isLoginMode ? "Don't have an account?" : "Already have an account?"}
      </p>
      <Button
        variant="outline"
        onClick={onToggleMode}
        className="relative z-10 border-2 border-white bg-transparent text-white hover:bg-white hover:text-[#6F54D8] rounded-full px-7"
      >
        {isLoginMode ? "Register" : "Login"}
      </Button>
    </div>
  );
}
