import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getFileUrl } from "@/lib/api";
import type { ResultRead, TaskRead } from "@/types/api";

type JsonRecord = Record<string, unknown>;

type PreviewItem = {
  key: string;
  title: string;
  url?: string | null;
  openUrl?: string | null;
  hint: string;
  badge?: string;
};

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asRecord(value: unknown): JsonRecord | null {
  return isRecord(value) ? value : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value;
  return null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function translateAiText(text: string) {
  const replacements: Array<[RegExp, string]> = [
    [/\bFRONT\b/g, "old ko‘rinish"],
    [/\bTOP\b/g, "ustki ko‘rinish"],
    [/\bSIDE\b/g, "profil ko‘rinish"],
    [/\bISO\b/g, "yaqqol tasvir"],
    [/\bisometric\b/gi, "yaqqol tasvir"],
    [/\bprofile\b/gi, "profil"],
    [/\borthographic\b/gi, "asosiy proyeksiya"],
    [/\bprojection count\b/gi, "proyeksiyalar soni"],
    [/\bprojection box\b/gi, "proyeksiya ramkasi"],
    [/\bprojection\b/gi, "proyeksiya"],
    [/\blayout\b/gi, "joylashuv"],
    [/\bconfidence\b/gi, "ishonchlilik"],
    [/\btitle block\b/gi, "asosiy yozuv jadvali"],
    [/\bmerge\b/gi, "qo‘shilib ketish"],
    [/\bmerged\b/gi, "qo‘shilib ketgan"],
    [/\bbox\b/gi, "ramka"],
    [/\bview\b/gi, "ko‘rinish"],
    [/\bviews\b/gi, "ko‘rinishlar"],
    [/\bevidence\b/gi, "belgi"],
    [/\brole\b/gi, "rol"],
    [/\bregion\b/gi, "soha"],
    [/\bcrop\b/gi, "qirqib olingan zona"],
  ];

  return replacements.reduce((acc, [pattern, replacement]) => acc.replace(pattern, replacement), text);
}

function safeText(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "number") return Number.isInteger(value) ? String(value) : String(Math.round(value * 100) / 100);
  if (typeof value === "boolean") return value ? "ha" : "yo‘q";
  if (typeof value === "object") return JSON.stringify(value);
  return translateAiText(String(value));
}

function scoreText(score?: number | null) {
  return typeof score === "number" ? `${Math.round(score * 100) / 100}/100` : "—/100";
}

function statusLabel(status?: string) {
  if (status === "evaluated") return "Baholandi";
  if (status === "failed") return "Xatolik";
  if (status === "pending") return "Kutilmoqda";
  return "—";
}

function statusVariant(status?: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "evaluated") return "default";
  if (status === "failed") return "destructive";
  if (status === "pending") return "secondary";
  return "outline";
}

function modeLabel(mode?: string) {
  return mode === "etalon" ? "Etalon" : mode === "optional" ? "Ixtiyoriy" : "—";
}

function fileKind(url?: string | null) {
  const normalized = (url ?? "").toLowerCase();
  if (normalized.endsWith(".pdf")) return "PDF";
  if (normalized.endsWith(".png")) return "PNG";
  if (normalized.endsWith(".jpg") || normalized.endsWith(".jpeg")) return "JPG";
  return "Fayl";
}

function getJson(result: ResultRead | null): JsonRecord {
  return asRecord(result?.ai_json_result) ?? {};
}

function getNestedRecord(root: JsonRecord, key: string): JsonRecord | null {
  return asRecord(root[key]);
}

function getFirstString(root: JsonRecord, keys: string[]) {
  for (const key of keys) {
    const value = asString(root[key]);
    if (value) return value;
  }
  return null;
}

function getGradeLabel(result: ResultRead | null) {
  const json = getJson(result);
  return getFirstString(json, ["grade_label", "grade", "label", "level"]);
}

function getConfidence(result: ResultRead | null) {
  const json = getJson(result);
  const score = asNumber(json.confidence_score ?? json.confidence ?? json.confidence_value);
  const label = asString(json.confidence_label ?? json.confidence_level);

  if (score === null && !label) return null;
  return `${label ? `${label} · ` : ""}${score !== null ? Math.round(score * 1000) / 1000 : "—"}`;
}

function getDrawingAiMetadata(result: ResultRead | null) {
  const json = getJson(result);
  return getNestedRecord(json, "drawing_ai_v2") ?? getNestedRecord(json, "metadata") ?? null;
}

function getStudentProjections(result: ResultRead | null) {
  const json = getJson(result);
  return asNumber(json.student_projections ?? json.detected_student_projections ?? json.projection_count);
}

function getReferenceProjections(result: ResultRead | null) {
  const json = getJson(result);
  return asNumber(json.reference_projections ?? json.detected_reference_projections ?? json.reference_projection_count);
}

function getElapsedMs(result: ResultRead | null) {
  const meta = getDrawingAiMetadata(result);
  const json = getJson(result);
  return asNumber(meta?.elapsed_ms ?? meta?.evaluation_time_ms ?? json.elapsed_ms ?? json.evaluation_time_ms);
}

function getReferenceFile(result: ResultRead | null, task?: TaskRead | null) {
  const json = getJson(result);
  const meta = getDrawingAiMetadata(result);
  return (
    asString(task?.reference_file_path) ??
    getFirstString(json, ["reference_file", "reference_file_path", "reference_path", "etalon_file", "etalon_file_path"]) ??
    asString(meta?.reference_file)
  );
}

function getOverlayFile(result: ResultRead | null) {
  const json = getJson(result);
  return (
    result?.overlay_url ??
    result?.overlay_path ??
    getFirstString(json, ["overlay_url", "overlay_path", "overlay_file", "result_overlay", "visual_overlay"])
  );
}

function getStudentFile(result: ResultRead | null) {
  const json = getJson(result);
  const meta = getDrawingAiMetadata(result);
  return (
    result?.uploaded_preview_url ??
    result?.uploaded_file_url ??
    result?.uploaded_file_path ??
    getFirstString(json, ["student_file", "student_file_path", "uploaded_file_path", "input_file"]) ??
    asString(meta?.student_file)
  );
}

function normalizeRows(result: ResultRead | null) {
  const json = getJson(result);
  const fromTable = result?.table_json ?? [];
  const candidates = [
    fromTable,
    asArray(json.criteria),
    asArray(json.criterion_scores),
    asArray(json.rubric),
    asArray(json.table),
    asArray(json.table_json),
  ];

  for (const rows of candidates) {
    if (rows.length) return rows;
  }

  return [];
}

function normalizePreviewItems(
  result: ResultRead | null,
  task?: TaskRead | null,
  options: { showReferencePreview?: boolean; showDebugArtifacts?: boolean } = {}
): PreviewItem[] {
  const json = getJson(result);
  const reference = getReferenceFile(result, task);
  const overlay = getOverlayFile(result);
  const student = getStudentFile(result);
  const visible = getFirstString(json, ["visible_overlay_url", "visible_overlay_path", "visible_file", "visible_result"]);
  const diff = getFirstString(json, ["diff_url", "diff_path", "difference_url", "difference_path"]);

  const items: PreviewItem[] = [
    {
      key: "student",
      title: "Talaba yuklagan chizma",
      url: student,
      openUrl: result?.uploaded_file_url ?? result?.uploaded_file_path ?? student,
      hint: "Talaba chizmasi URL/path topilmadi.",
      badge: fileKind(student),
    },
    {
      key: "overlay",
      title: "AI belgilagan chizma",
      url: overlay,
      openUrl: overlay,
      hint: "AI belgilagan chizma topilmadi.",
      badge: "Overlay",
    },
  ];

  if (options.showReferencePreview && reference) {
    items.push({
      key: "reference",
      title: "Etalon chizma",
      url: reference,
      openUrl: reference,
      hint: "Etalon fayl topilmadi.",
      badge: fileKind(reference),
    });
  }

  if (options.showDebugArtifacts && visible) {
    items.push({
      key: "visible",
      title: "AI ko‘rgan ko‘rinadigan zona",
      url: visible,
      openUrl: visible,
      hint: "Ko‘rinadigan zona artefakti topilmadi.",
      badge: "Debug",
    });
  }

  if (options.showDebugArtifacts && diff) {
    items.push({
      key: "diff",
      title: "Difference / taqqoslash artefakti",
      url: diff,
      openUrl: diff,
      hint: "Difference artefakti topilmadi.",
      badge: "Diff",
    });
  }

  return items;
}

function PreviewBox({ item }: { item: PreviewItem }) {
  const finalUrl = getFileUrl(item.url);
  const finalOpenUrl = getFileUrl(item.openUrl ?? item.url);
  const lower = (finalUrl ?? "").toLowerCase();

  return (
    <div className="space-y-2 rounded-xl border bg-background p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-semibold">{item.title}</div>
        <Badge variant={finalUrl ? "outline" : "secondary"} className="text-xs">
          {finalUrl ? item.badge ?? "Mavjud" : "Yo‘q"}
        </Badge>
      </div>

      {finalUrl ? (
        <div className="overflow-hidden rounded-lg border bg-muted/30">
          {lower.endsWith(".pdf") ? (
            <iframe src={finalUrl} className="h-[520px] w-full" title={item.title} />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={finalUrl} alt={item.title} className="max-h-[520px] w-full object-contain" />
          )}
        </div>
      ) : (
        <div className="flex aspect-video items-center justify-center rounded-lg border bg-muted/30 px-4 text-center text-sm text-muted-foreground">
          {item.hint}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="break-all">{item.url ? item.url : item.hint}</span>
        {finalOpenUrl ? (
          <a href={finalOpenUrl} target="_blank" rel="noreferrer" className="whitespace-nowrap text-blue-600 hover:underline">
            Yangi oynada ochish
          </a>
        ) : null}
      </div>
    </div>
  );
}

function MetricCard({ label, value, hint }: { label: string; value: unknown; hint?: string }) {
  return (
    <div className="rounded-xl border bg-muted/20 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold">{safeText(value)}</div>
      {hint ? <div className="mt-1 text-xs text-muted-foreground">{hint}</div> : null}
    </div>
  );
}

function RubricTable({ result }: { result: ResultRead | null }) {
  const rows = normalizeRows(result);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Baholash mezonlari</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table className="min-w-[760px]">
          <TableHeader>
            <TableRow>
              <TableHead>Mezon</TableHead>
              <TableHead>Izoh</TableHead>
              <TableHead className="text-right">Ball</TableHead>
              <TableHead className="text-right">Maks.</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length ? (
              rows.map((rawRow, index) => {
                const row = asRecord(rawRow) ?? {};
                const criterion = row.criterion ?? row.name ?? row.title ?? row.label ?? `Mezon ${index + 1}`;
                const comment = row.comment ?? row.status ?? row.note ?? row.description ?? row.feedback;
                const score = row.score ?? row.ball ?? row.points ?? row.value;
                const maxScore = row.max_score ?? row.max_ball ?? row.max ?? row.total ?? row.max_points;

                return (
                  <TableRow key={`${safeText(criterion)}-${index}`}>
                    <TableCell className="font-medium">{safeText(criterion)}</TableCell>
                    <TableCell className="text-muted-foreground">{safeText(comment)}</TableCell>
                    <TableCell className="text-right font-medium">{safeText(score)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{safeText(maxScore)}</TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell>Jami</TableCell>
                <TableCell className="text-muted-foreground">AI umumiy natijasi</TableCell>
                <TableCell className="text-right font-medium">{scoreText(result?.total_score)}</TableCell>
                <TableCell className="text-right text-muted-foreground">100</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function DiagnosticsJsonBlock({ title, value }: { title: string; value: unknown }) {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value) && value.length === 0) return null;
  if (isRecord(value) && Object.keys(value).length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">{title}</div>
      <pre className="max-h-64 overflow-auto rounded-xl border bg-muted/20 p-3 text-xs">
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}

function DiagnosticsBlocks({ result }: { result: ResultRead | null }) {
  const json = getJson(result);
  const metadata = getDrawingAiMetadata(result);
  const projectionBoxes = json.projection_boxes ?? json.student_projection_boxes ?? json.detected_projection_boxes;
  const referenceBoxes = json.reference_projection_boxes ?? json.reference_boxes;
  const visibleBox = json.visible_box ?? json.drawing_area_box ?? json.page_box;
  const warnings = asArray(json.warnings);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Texnik ma’lumotlar</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Engine" value={metadata?.engine_version ?? "—"} />
          <MetricCard label="Scoring" value={metadata?.scoring_version ?? "—"} />
          <MetricCard label="Criteria locked" value={metadata?.criteria_locked ?? "—"} />
          <MetricCard label="Task matni ishlatildi" value={metadata?.task_text_applied ?? json.task_text_used ?? json.task_text_applied ?? "—"} />
        </div>

        {warnings.length ? (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            <div className="font-semibold">AI ogohlantirishlari</div>
            <ul className="mt-2 list-inside list-disc space-y-1">
              {warnings.map((warning, index) => (
                <li key={index}>{safeText(warning)}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-2">
          <DiagnosticsJsonBlock title="Student projection_boxes" value={projectionBoxes} />
          <DiagnosticsJsonBlock title="Reference projection_boxes" value={referenceBoxes} />
          <DiagnosticsJsonBlock title="Visible / drawing area box" value={visibleBox} />
          <DiagnosticsJsonBlock title="drawing_ai_v2 metadata" value={metadata} />
        </div>
      </CardContent>
    </Card>
  );
}

function AutoWarnings({ result }: { result: ResultRead | null }) {
  const studentProjections = getStudentProjections(result);
  const overlay = getOverlayFile(result);
  const json = getJson(result);
  const mode = result?.mode ?? asString(json.mode);
  const confidence = asNumber(json.confidence_score ?? json.confidence);
  const messages: string[] = [];

  if (mode === "etalon" && studentProjections !== null && studentProjections < 2) {
    messages.push("Etalon rejimda AI 2 tadan kam proyeksiya topdi. AI belgilagan chizma orqali qaysi joy tanlanganini tekshiring.");
  }

  if (!overlay && result?.status === "evaluated") {
    messages.push("Natija baholangan, lekin AI belgilagan chizma topilmadi.");
  }

  if (confidence !== null && confidence < 0.5) {
    messages.push("Ishonchlilik past. Ushbu natijani o‘qituvchi ko‘rib chiqishi tavsiya qilinadi.");
  }

  if (!messages.length) return null;

  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
      <div className="font-semibold">AI eslatmasi</div>
      <ul className="mt-2 list-inside list-disc space-y-1">
        {messages.map((message) => (
          <li key={message}>{message}</li>
        ))}
      </ul>
    </div>
  );
}

export function DrawingAiResultDiagnostics({
  result,
  task,
  showRawJson = false,
  showTechnicalDetails = false,
  showReferencePreview = false,
  showDebugArtifacts = false,
}: {
  result: ResultRead | null;
  task?: TaskRead | null;
  showRawJson?: boolean;
  showTechnicalDetails?: boolean;
  showReferencePreview?: boolean;
  showDebugArtifacts?: boolean;
}) {
  if (!result) {
    return (
      <div className="rounded-xl border bg-muted/20 p-4 text-sm text-muted-foreground">
        Hali AI natijasi mavjud emas.
      </div>
    );
  }

  const json = getJson(result);
  const metadata = getDrawingAiMetadata(result);
  const previewItems = normalizePreviewItems(result, task, { showReferencePreview, showDebugArtifacts });
  const grade = getGradeLabel(result);
  const confidence = getConfidence(result);
  const studentProjections = getStudentProjections(result);
  const referenceProjections = getReferenceProjections(result);
  const elapsedMs = getElapsedMs(result);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline">{modeLabel(result.mode)}</Badge>
        <Badge variant={statusVariant(result.status)}>{statusLabel(result.status)}</Badge>
        <Badge variant="secondary">Submission #{result.id}</Badge>
        <Badge variant="outline">Urinish: {result.attempt_number}/2</Badge>
        <Badge variant="outline">Ball: {scoreText(result.total_score)}</Badge>
        {grade ? <Badge variant="secondary">{grade}</Badge> : null}
      </div>

      <AutoWarnings result={result} />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Umumiy ball" value={scoreText(result.total_score)} />
        <MetricCard label="Baho" value={grade ?? "—"} />
        <MetricCard label="Ishonchlilik" value={confidence ?? "—"} />
        <MetricCard label="AI topgan ko‘rinishlar" value={studentProjections ?? "—"} />
      </div>

      {showTechnicalDetails ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Reference projections" value={referenceProjections ?? "—"} />
          <MetricCard label="Engine version" value={metadata?.engine_version ?? "—"} />
          <MetricCard label="Scoring version" value={metadata?.scoring_version ?? "—"} />
          <MetricCard label="Task text applied" value={metadata?.task_text_applied ?? json.task_text_used ?? json.task_text_applied ?? "—"} />
          <MetricCard label="Elapsed" value={elapsedMs !== null ? `${elapsedMs} ms` : "—"} />
        </div>
      ) : null}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Chizma preview va overlay</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-2">
            {previewItems.map((item) => (
              <div key={item.key}>
                <PreviewBox item={item} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <RubricTable result={result} />
      {showTechnicalDetails ? <DiagnosticsBlocks result={result} /> : null}

      {result.status === "failed" ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4">
          <div className="text-sm font-semibold text-destructive">AI baholashda xatolik</div>
          <pre className="mt-3 max-h-72 overflow-auto rounded-lg bg-background p-3 text-xs">
            {JSON.stringify(result.ai_json_result ?? {}, null, 2)}
          </pre>
        </div>
      ) : null}

      {showRawJson ? (
        <>
          <Separator />
          <div className="space-y-2">
            <div className="text-sm font-medium">To‘liq texnik JSON</div>
            <pre className="max-h-[520px] overflow-auto rounded-xl border bg-muted/20 p-4 text-xs">
              {JSON.stringify(result.ai_json_result ?? {}, null, 2)}
            </pre>
          </div>
        </>
      ) : null}
    </div>
  );
}
