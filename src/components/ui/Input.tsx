import { cn } from "./cn";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full rounded-md border border-default bg-white px-3 py-2 text-sm outline-none",
        "focus:ring-0 focus:border-accent",
        className
      )}
      {...props}
    />
  );
}

