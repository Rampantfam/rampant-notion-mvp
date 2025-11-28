import { cn } from "./cn";
type Props = { children: React.ReactNode; className?: string };
export function Badge({ children, className }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium",
        "border border-default bg-white",
        className
      )}
    >
      {children}
    </span>
  );
}

