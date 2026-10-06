import { cn } from "./ui/utils";

const markUrl = new URL("../../../assets/pinwi-mark.svg", import.meta.url).href;
const wordmarkUrl = new URL("../../../assets/pinwi-wordmark.svg", import.meta.url).href;
const fullLogoUrl = new URL("../../../assets/Logo_Pinwi.svg", import.meta.url).href;

interface BrandLogoProps {
  variant?: "lockup" | "mark" | "full";
  tone?: "light" | "dark";
  className?: string;
}

/** All variants preserve the artwork from assets/Logo_Pinwi.svg. */
export function BrandLogo({ variant = "lockup", tone = "dark", className }: BrandLogoProps) {
  if (variant === "full") {
    return (
      <svg
        role="img"
        aria-label="Pinwi"
        viewBox="330 288 1300 1200"
        width={1300}
        height={1200}
        className={cn("h-auto w-48 shrink-0", className)}
      >
        <image href={fullLogoUrl} width={2000} height={2000} />
      </svg>
    );
  }

  if (variant === "mark") {
    return (
      <img
        src={markUrl}
        alt="Pinwi"
        width={603}
        height={805}
        className={cn("h-12 w-auto shrink-0 object-contain", className)}
      />
    );
  }

  return (
    <span role="img" aria-label="Pinwi" className={cn("inline-flex shrink-0 items-center gap-2.5", className)}>
      <img src={markUrl} alt="" aria-hidden="true" width={603} height={805} className="h-12 w-auto object-contain" />
      <img
        src={wordmarkUrl}
        alt=""
        aria-hidden="true"
        width={1280}
        height={490}
        className={cn("h-8 w-auto object-contain", tone === "light" && "brightness-0 invert")}
      />
    </span>
  );
}
