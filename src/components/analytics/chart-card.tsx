"use client";

import type { ReactNode } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { exportSvgChart, type ImageFormat } from "@/components/analytics/chart-export";

export function ChartCard({
  title,
  description,
  chartId,
  filename,
  children,
}: {
  title: string;
  description: string;
  chartId: string;
  filename: string;
  children: ReactNode;
}) {
  async function download(format: ImageFormat) {
    try {
      await exportSvgChart(chartId, filename, format);
      toast.success(`Diagramma ${format.toUpperCase()} formatda yuklandi.`);
    } catch (error) {
      console.error(error);
      toast.error("Diagrammani yuklab olishda xatolik yuz berdi.");
    }
  }

  return (
    <Card className="overflow-hidden shadow-sm">
      <CardHeader className="gap-3 border-b bg-muted/20 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <CardTitle className="text-base">{title}</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => download("png")}>
            <Download className="mr-2 h-4 w-4" />
            PNG
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => download("jpeg")}>
            <Download className="mr-2 h-4 w-4" />
            JPEG
          </Button>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto p-4 lg:p-6">{children}</CardContent>
    </Card>
  );
}
