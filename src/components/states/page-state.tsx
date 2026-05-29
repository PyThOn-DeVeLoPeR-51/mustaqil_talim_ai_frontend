import { AlertCircle, Loader2, SearchX } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function LoadingState({ title = "Ma’lumotlar yuklanmoqda..." }: { title?: string }) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex min-h-40 flex-col items-center justify-center gap-3 py-10 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{title}</p>
      </CardContent>
    </Card>
  );
}

export function EmptyState({
  title = "Ma’lumot topilmadi",
  description = "Hozircha ko‘rsatish uchun ma’lumot yo‘q.",
  action,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex min-h-48 flex-col items-center justify-center gap-3 py-10 text-center">
        <div className="rounded-full bg-muted p-3">
          <SearchX className="h-8 w-8 text-muted-foreground" />
        </div>
        <div>
          <h3 className="font-semibold">{title}</h3>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
        </div>
        {action ? <div className="mt-2">{action}</div> : null}
      </CardContent>
    </Card>
  );
}

export function ErrorState({
  title = "Xatolik yuz berdi",
  description,
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <Card className="border-destructive/30 bg-destructive/5">
      <CardContent className="flex min-h-40 flex-col items-center justify-center gap-3 py-10 text-center">
        <div className="rounded-full bg-destructive/10 p-3">
          <AlertCircle className="h-8 w-8 text-destructive" />
        </div>
        <div>
          <h3 className="font-semibold text-destructive">{title}</h3>
          {description ? <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {onRetry ? (
          <Button variant="outline" onClick={onRetry}>
            Qayta urinish
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
