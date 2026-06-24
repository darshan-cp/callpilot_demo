import { TableHead } from "@/components/ui/table";
import { InfoTooltip } from "@/components/InfoTooltip";
import { cn } from "@/lib/utils";

interface TableHeadWithHelpProps {
  children: React.ReactNode;
  help: string;
  className?: string;
}

export function TableHeadWithHelp({ children, help, className }: TableHeadWithHelpProps) {
  const isRight = className?.includes("text-right");
  const isCenter = className?.includes("text-center");

  return (
    <TableHead className={className}>
      <div
        className={cn(
          "flex items-center gap-1",
          isRight && "justify-end",
          isCenter && "justify-center",
        )}
      >
        <span>{children}</span>
        <InfoTooltip content={help} />
      </div>
    </TableHead>
  );
}
