import { ReactNode } from "react";
import { Separator } from "@/components/ui/separator";

type Props = {
  title: string;
  subtitle?: string;
  right?: ReactNode;
};

export function PageHeader({ title, subtitle, right }: Props) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {subtitle ? (
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>

        {right ? <div className="flex shrink-0 items-center gap-2">{right}</div> : null}
      </div>

      <Separator />
    </div>
  );
}
