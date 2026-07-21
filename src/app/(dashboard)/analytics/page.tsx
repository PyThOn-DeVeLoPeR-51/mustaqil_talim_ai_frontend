"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CircleOff,
  Loader2,
  RefreshCw,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";

import { getTeacherAnalytics } from "@/api/analytics";
import { ChartCard } from "@/components/analytics/chart-card";
import {
  DonutChart,
  GroupBarChart,
  HeatmapChart,
  LineProgressChart,
  RadarChart,
} from "@/components/analytics/charts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type {
  ExperimentGroup,
  TaskMode,
  TeacherAnalyticsParams,
  TeacherAnalyticsRead,
} from "@/types/api";

const DISTRIBUTION_COLORS = {
  high: "#16a34a",
  good: "#2563eb",
  satisfactory: "#d97706",
  low: "#dc2626",
} as const;

const selectClass =
  "h-10 w-full rounded-md border bg-background px-3 text-sm outline-none transition focus:ring-2 focus:ring-ring";

function formatScore(value: number | null, suffix = "") {
  return value === null ? "—" : `${value.toFixed(1)}${suffix}`;
}

function formatSignedScore(value: number | null) {
  if (value === null) return "—";
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}`;
}

function MetricCard({
  title,
  value,
  hint,
  icon,
  positive,
}: {
  title: string;
  value: string;
  hint: string;
  icon: ReactNode;
  positive?: boolean;
}) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold tracking-tight">{value}</div>
        <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
          {positive === true ? (
            <ArrowUpRight className="h-3.5 w-3.5 text-emerald-600" />
          ) : null}
          {positive === false ? (
            <ArrowDownRight className="h-3.5 w-3.5 text-red-600" />
          ) : null}
          {hint}
        </div>
      </CardContent>
    </Card>
  );
}

export default function AnalyticsPage() {
  const [group, setGroup] = useState("all");
  const [studentId, setStudentId] = useState("all");
  const [experimentType, setExperimentType] = useState<
    "all" | ExperimentGroup
  >("all");
  const [taskMode, setTaskMode] = useState<"all" | TaskMode>("all");

  const [analytics, setAnalytics] = useState<TeacherAnalyticsRead | null>(null);
  const [baseline, setBaseline] = useState<TeacherAnalyticsRead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const requestIdRef = useRef(0);

  const hasActiveFilters =
    group !== "all" ||
    studentId !== "all" ||
    experimentType !== "all" ||
    taskMode !== "all";

  const requestParams = useMemo<TeacherAnalyticsParams>(() => {
    const params: TeacherAnalyticsParams = {};

    if (group !== "all") params.group_name = group;
    if (studentId !== "all") params.student_id = Number(studentId);
    if (experimentType !== "all") {
      params.experiment_group = experimentType;
    }
    if (taskMode !== "all") params.mode = taskMode;

    return params;
  }, [experimentType, group, studentId, taskMode]);

  const loadAnalytics = useCallback(async () => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    setLoading(true);
    setError(null);

    try {
      if (hasActiveFilters) {
        const [filteredResponse, baselineResponse] = await Promise.all([
          getTeacherAnalytics(requestParams),
          getTeacherAnalytics(),
        ]);

        if (requestId !== requestIdRef.current) return;

        setAnalytics(filteredResponse);
        setBaseline(baselineResponse);
      } else {
        const response = await getTeacherAnalytics();

        if (requestId !== requestIdRef.current) return;

        setAnalytics(response);
        setBaseline(response);
      }
    } catch (caughtError) {
      if (requestId !== requestIdRef.current) return;

      console.error(caughtError);
      setError(
        "Analytics ma’lumotlarini yuklab bo‘lmadi. Backend ishlayotganini va o‘qituvchi sessiyasini tekshiring.",
      );
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [hasActiveFilters, requestParams]);

  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics, reloadKey]);

  const studentOptions = useMemo(() => {
    const students = analytics?.filters.students ?? baseline?.filters.students ?? [];

    return students.filter((student) => {
      if (group !== "all" && student.group_name !== group) return false;
      if (
        experimentType !== "all" &&
        student.experiment_group !== experimentType
      ) {
        return false;
      }
      return true;
    });
  }, [analytics, baseline, experimentType, group]);

  const scopeLabel = useMemo(() => {
    if (studentId !== "all") {
      return (
        studentOptions.find((student) => student.id === Number(studentId))
          ?.full_name ?? "Tanlangan talaba"
      );
    }

    if (group !== "all") return `${group} guruhi`;
    if (experimentType === "experimental") return "Tajriba guruhi";
    if (experimentType === "control") return "Nazorat guruhi";
    if (taskMode === "etalon") return "Etalon topshiriqlar";
    if (taskMode === "optional") return "Ixtiyoriy topshiriqlar";

    return "Barcha talabalar";
  }, [experimentType, group, studentId, studentOptions, taskMode]);

  function resetFilters() {
    setGroup("all");
    setStudentId("all");
    setExperimentType("all");
    setTaskMode("all");
  }

  if (loading && !analytics) {
    return (
      <Card className="shadow-sm">
        <CardContent className="flex min-h-80 flex-col items-center justify-center gap-3 p-8 text-center">
          <Loader2 className="h-9 w-9 animate-spin text-primary" />
          <div>
            <h1 className="font-semibold">Analytics yuklanmoqda</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Talabalar natijalari va diagrammalar tayyorlanmoqda.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error && !analytics) {
    return (
      <Card className="border-red-200 shadow-sm">
        <CardContent className="flex min-h-80 flex-col items-center justify-center p-8 text-center">
          <AlertCircle className="h-10 w-10 text-red-600" />
          <h1 className="mt-4 text-lg font-semibold">Ma’lumot yuklanmadi</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            {error}
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-5"
            onClick={() => setReloadKey((value) => value + 1)}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Qayta urinish
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!analytics) return null;

  const { summary, progress, filters } = analytics;
  const hasMatchingStudents = summary.student_count > 0;
  const hasEvaluatedResults = summary.evaluated_student_count > 0;

  const distribution = analytics.distribution.map((item) => ({
    label: item.label,
    value: item.value,
    color: DISTRIBUTION_COLORS[item.key],
  }));

  const heatmapRows = analytics.heatmap.map((row) => ({
    name: row.name,
    values: row.values,
  }));

  const growthPositive =
    summary.growth === null ? undefined : summary.growth >= 0;
  const successPositive =
    summary.success_rate === null ? undefined : summary.success_rate >= 70;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
            <Badge variant="secondary">Real backend ma’lumotlari</Badge>
            {loading ? (
              <Badge variant="outline" className="gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Yangilanmoqda
              </Badge>
            ) : null}
          </div>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
            O‘qituvchi faqat o‘zi biriktirgan talabalar natijalarini guruh,
            talaba, tajriba turi va topshiriq rejimi bo‘yicha tahlil qiladi.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={resetFilters}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Filtrlarni tozalash
        </Button>
      </div>

      {error ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <span>{error}</span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setReloadKey((value) => value + 1)}
          >
            Qayta urinish
          </Button>
        </div>
      ) : null}

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Tahlil filtrlari</CardTitle>
          <p className="text-sm text-muted-foreground">
            Filtrlar o‘zgarganda metrikalar va diagrammalar backenddan qayta
            hisoblanadi.
          </p>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="space-y-2 text-sm font-medium">
            <span>Guruh</span>
            <select
              className={selectClass}
              value={group}
              onChange={(event) => {
                setGroup(event.target.value);
                setStudentId("all");
              }}
            >
              <option value="all">Barcha guruhlar</option>
              {filters.groups.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-sm font-medium">
            <span>Talaba</span>
            <select
              className={selectClass}
              value={studentId}
              onChange={(event) => setStudentId(event.target.value)}
            >
              <option value="all">Barcha talabalar</option>
              {studentOptions.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.full_name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-sm font-medium">
            <span>Tajriba-sinov turi</span>
            <select
              className={selectClass}
              value={experimentType}
              onChange={(event) => {
                setExperimentType(
                  event.target.value as "all" | ExperimentGroup,
                );
                setStudentId("all");
              }}
            >
              <option value="all">Barchasi</option>
              <option value="experimental">Tajriba guruhi</option>
              <option value="control">Nazorat guruhi</option>
            </select>
          </label>

          <label className="space-y-2 text-sm font-medium">
            <span>Topshiriq rejimi</span>
            <select
              className={selectClass}
              value={taskMode}
              onChange={(event) =>
                setTaskMode(event.target.value as "all" | TaskMode)
              }
            >
              <option value="all">Barcha rejimlar</option>
              <option value="etalon">Etalon</option>
              <option value="optional">Ixtiyoriy</option>
            </select>
          </label>
        </CardContent>
      </Card>

      {!hasMatchingStudents ? (
        <Card className="border-dashed shadow-sm">
          <CardContent className="flex min-h-64 flex-col items-center justify-center p-8 text-center">
            <CircleOff className="h-10 w-10 text-muted-foreground" />
            <h2 className="mt-4 text-lg font-semibold">Mos talaba topilmadi</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
              Tanlangan filtrlar bir-biriga mos kelmadi. Boshqa guruh, talaba
              yoki tajriba turini tanlang.
            </p>
            <Button
              type="button"
              variant="outline"
              className="mt-5"
              onClick={resetFilters}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Filtrlarni tozalash
            </Button>
          </CardContent>
        </Card>
      ) : !hasEvaluatedResults ? (
        <Card className="border-dashed shadow-sm">
          <CardContent className="flex min-h-64 flex-col items-center justify-center p-8 text-center">
            <CircleOff className="h-10 w-10 text-muted-foreground" />
            <h2 className="mt-4 text-lg font-semibold">
              Baholangan natija hali mavjud emas
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
              {scopeLabel} bo‘yicha {summary.student_count} nafar talaba topildi,
              ammo tanlangan kesimda hali baholangan topshiriq yo‘q.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title="Tanlangan talabalar"
              value={String(summary.student_count)}
              hint={`${summary.evaluated_student_count} nafarida natija mavjud`}
              icon={<Users className="h-4 w-4" />}
            />
            <MetricCard
              title="Yakuniy o‘rtacha"
              value={formatScore(summary.final_average, "/100")}
              hint={`Boshlang‘ich: ${formatScore(summary.initial_average)}`}
              icon={<Target className="h-4 w-4" />}
              positive={growthPositive}
            />
            <MetricCard
              title="Umumiy o‘sish"
              value={formatSignedScore(summary.growth)}
              hint="Boshlang‘ichdan yakuniygacha"
              icon={<TrendingUp className="h-4 w-4" />}
              positive={growthPositive}
            />
            <MetricCard
              title="Muvaffaqiyat"
              value={
                summary.success_rate === null
                  ? "—"
                  : `${summary.success_rate.toFixed(0)}%`
              }
              hint={`Baholangan ${summary.evaluated_student_count} talaba; 2-urinish: ${formatSignedScore(summary.second_attempt_growth)}`}
              icon={<BarChart3 className="h-4 w-4" />}
              positive={successPositive}
            />
          </div>

          <ChartCard
            title="Natijaning davrlar bo‘yicha o‘zgarishi"
            description="Boshlang‘ich diagnostikadan yakuniy nazoratgacha bo‘lgan dinamik o‘sish yoki pasayish. Chiziq uzilgan joylarda ma’lumot mavjud emas."
            chartId="progress-line-chart"
            filename="natijalar-dinamikasi"
          >
            <LineProgressChart
              id="progress-line-chart"
              labels={progress.labels}
              values={progress.values}
              comparisonValues={
                hasActiveFilters ? baseline?.progress.values : undefined
              }
              mainLabel={scopeLabel}
              comparisonLabel={hasActiveFilters ? "Umumiy o‘rtacha" : undefined}
            />
          </ChartCard>

          <div className="grid gap-6 2xl:grid-cols-2">
            <ChartCard
              title="Tajriba va nazorat guruhlari natijasi"
              description="Tajriba-sinov boshidagi va yakunidagi o‘rtacha ballar taqqoslanadi."
              chartId="group-bar-chart"
              filename="tajriba-nazorat-solishtiruvi"
            >
              <GroupBarChart
                id="group-bar-chart"
                data={analytics.group_comparison}
              />
            </ChartCard>

            <ChartCard
              title="Baholangan talabalar taqsimoti"
              description="Natijasi mavjud talabalar sifat darajalari bo‘yicha taqsimlanadi."
              chartId="score-donut-chart"
              filename="natijalar-taqsimoti"
            >
              <DonutChart id="score-donut-chart" values={distribution} />
            </ChartCard>
          </div>

          <div className="grid gap-6 2xl:grid-cols-2">
            <ChartCard
              title="Rubrika mezonlari tahlili"
              description="Proyeksiya, o‘lcham, chiziqlar, aniqlik va standartlarga rioya qilish kesimida."
              chartId="criteria-radar-chart"
              filename="rubrika-mezonlari"
            >
              <RadarChart
                id="criteria-radar-chart"
                labels={analytics.criteria.labels}
                values={analytics.criteria.values}
              />
            </ChartCard>

            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">
                  Ilmiy-metodik xulosa
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Tanlangan kesim bo‘yicha real natijalardan avtomatik
                  shakllangan qisqa tahlil.
                </p>
              </CardHeader>
              <CardContent className="space-y-4 text-sm leading-6">
                <div className="rounded-xl border bg-muted/20 p-4">
                  <strong>{scopeLabel}</strong> bo‘yicha jami{" "}
                  <strong>{summary.student_count}</strong> nafar talaba topildi.
                  Ulardan <strong>{summary.evaluated_student_count}</strong>
                  nafari kamida bitta baholangan natijaga ega.
                </div>

                <div className="rounded-xl border bg-muted/20 p-4">
                  Boshlang‘ich o‘rtacha natija{" "}
                  <strong>{formatScore(summary.initial_average)}</strong> ball,
                  yakuniy natija esa{" "}
                  <strong>{formatScore(summary.final_average)}</strong> ballni
                  tashkil etdi. Umumiy o‘zgarish{" "}
                  <strong>{formatSignedScore(summary.growth)}</strong> ball.
                </div>

                <div className="rounded-xl border bg-muted/20 p-4">
                  56 va undan yuqori o‘rtacha ballga ega talabalar ulushi{" "}
                  <strong>
                    {summary.success_rate === null
                      ? "—"
                      : `${summary.success_rate.toFixed(0)}%`}
                  </strong>
                  . Ikkinchi urinish mavjud topshiriqlarda o‘rtacha o‘zgarish{" "}
                  <strong>
                    {formatSignedScore(summary.second_attempt_growth)}
                  </strong>{" "}
                  ball.
                </div>
              </CardContent>
            </Card>
          </div>

          <ChartCard
            title="Talabalar kesimidagi natijalar xaritasi"
            description="Ma’lumot mavjud bo‘lmagan kataklar chiziqcha bilan ko‘rsatiladi; bu 0 ball degani emas."
            chartId="student-heatmap-chart"
            filename="talabalar-heatmap"
          >
            <HeatmapChart
              id="student-heatmap-chart"
              rows={heatmapRows}
              columns={progress.labels}
            />
          </ChartCard>
        </>
      )}
    </div>
  );
}
