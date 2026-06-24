import { InfoTooltip } from "@/components/InfoTooltip";

interface StatLabelProps {
  children: React.ReactNode;
  help: string;
  className?: string;
}

/** Muted label with an inline info tooltip — for cards and stat blocks. */
export function StatLabel({ children, help, className = "text-muted-foreground mb-0.5" }: StatLabelProps) {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <span>{children}</span>
      <InfoTooltip content={help} />
    </div>
  );
}
