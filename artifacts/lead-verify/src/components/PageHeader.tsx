import { InfoTooltip } from "@/components/InfoTooltip";

interface PageHeaderProps {
  title: string;
  description?: string;
  help?: string;
  action?: React.ReactNode;
}

export function PageHeader({ title, description, help, action }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="flex items-center gap-1.5">
          <h1 className="text-xl font-bold text-foreground">{title}</h1>
          {help && <InfoTooltip content={help} />}
        </div>
        {description && (
          <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
