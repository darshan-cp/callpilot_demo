import { Label } from "@/components/ui/label";
import { InfoTooltip } from "@/components/InfoTooltip";
import { cn } from "@/lib/utils";

interface LabelWithHelpProps {
  children: React.ReactNode;
  help: string;
  htmlFor?: string;
  className?: string;
}

export function LabelWithHelp({ children, help, htmlFor, className }: LabelWithHelpProps) {
  return (
    <div className="flex items-center gap-1">
      <Label htmlFor={htmlFor} className={cn(className)}>{children}</Label>
      <InfoTooltip content={help} />
    </div>
  );
}
