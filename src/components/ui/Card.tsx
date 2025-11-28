import { cn } from "./cn";

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("rounded-md border border-default bg-white", className)}>{children}</div>;
}

export function CardHeader({ title, subtitle, className }: { title?: string; subtitle?: string; className?: string }) {
  return (
    <div className={cn("px-4 py-3 border-b border-default", className)}>
      {title && <h3 className="text-base font-semibold">{title}</h3>}
      {subtitle && <p className="text-sm text-muted mt-1">{subtitle}</p>}
    </div>
  );
}

export function CardBody({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("px-4 py-4", className)}>{children}</div>;
}

