import { ArkhosIcon } from "./arkhos-icon";

type LogoSize = "sm" | "md" | "lg";

interface ArkhosLogoProps {
  size?: LogoSize;
  showText?: boolean;
  className?: string;
}

const sizeMap: Record<LogoSize, { icon: number; text: string }> = {
  sm: { icon: 24, text: "text-[20px]" },
  md: { icon: 32, text: "text-[28px]" },
  lg: { icon: 48, text: "text-[42px]" },
};

export function ArkhosLogo({
  size = "md",
  showText = true,
  className,
}: ArkhosLogoProps) {
  const { icon, text } = sizeMap[size];

  return (
    <div className={`flex items-center gap-2.5 ${className ?? ""}`}>
      <ArkhosIcon size={icon} />
      {showText && (
        <span
          className={`font-display font-extralight tracking-[0.28em] uppercase leading-none text-foreground ${text}`}
        >
          Arkhos
        </span>
      )}
    </div>
  );
}
