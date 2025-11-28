import { cn } from "./cn";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
};

export function Button({ className, ...props }: Props) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm transition-all ease-ramp duration-ramp",
        "border border-transparent", // neutral by default
        className
      )}
      {...props}
    />
  );
}

