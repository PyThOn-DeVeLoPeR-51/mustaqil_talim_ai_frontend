"use client";

import { useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, BarChart3, RefreshCw, Target, TrendingUp, Users } from "lucide-react";

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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type StudentAnalytics = {
  id: number;
  name: string;
  group: string;
  experimentType: "experimental" | "control";
  taskMode: "etalon" | "optional";
  scores: [number, number, number, number, number, number];
  firstAttempt: number;
  secondAttempt: number;
  criteria: [number, number, number, number, number];
};

const students: StudentAnalytics[] = [
  { id: 1, name: "Aziza Karimova", group: "MG-101", experimentType: "experimental", taskMode: "etalon", scores: [48, 56, 64, 72, 80, 88], firstAttempt: 67, secondAttempt: 86, criteria: [90, 84, 86, 88, 82] },
  { id: 2, name: "Bekzod Rasulov", group: "MG-101", experimentType: "experimental", taskMode: "optional", scores: [52, 58, 66, 70, 78, 84], firstAttempt: 64, secondAttempt: 82, criteria: [82, 86, 79, 84, 80] },
  { id: 3, name: "Dilnoza Ismoilova", group: "MG-101", experimentType: "experimental", taskMode: "etalon", scores: [45, 54, 63, 71, 76, 85], firstAttempt: 61, secondAttempt: 83, criteria: [88, 80, 83, 86, 81] },
  { id: 4, name: "Javohir To‘xtayev", group: "MG-101", experimentType: "experimental", taskMode: "optional", scores: [57, 62, 68, 75, 81, 87], firstAttempt: 69, secondAttempt: 85, criteria: [85, 82, 87, 88, 84] },
  { id: 5, name: "Malika Usmonova", group: "MG-102", experimentType: "experimental", taskMode: "etalon", scores: [50, 60, 67, 74, 82, 90], firstAttempt: 66, secondAttempt: 88, criteria: [92, 87, 89, 90, 86] },
  { id: 6, name: "Sardor Abduqodirov", group: "MG-102", experimentType: "experimental", taskMode: "optional", scores: [43, 52, 60, 68, 73, 82], firstAttempt: 58, secondAttempt: 79, criteria: [80, 76, 82, 81, 77] },
  { id: 7, name: "Kamola Yusupova", group: "MG-201", experimentType: "control", taskMode: "etalon", scores: [49, 52, 56, 59, 63, 68], firstAttempt: 60, secondAttempt: 67, criteria: [72, 68, 70, 71, 66] },
  { id: 8, name: "Mirjalol Aliyev", group: "MG-201", experimentType: "control", taskMode: "optional", scores: [54, 56, 59, 61, 65, 70], firstAttempt: 62, secondAttempt: 69, criteria: [74, 71, 68, 73, 69] },
  { id: 9, name: "Nodira Hamroyeva", group: "MG-201", experimentType: "control", taskMode: "etalon", scores: [46, 49, 53, 57, 60, 66], firstAttempt: 57, secondAttempt: 65, criteria: [69, 66, 67, 70, 65] },
  { id: 10, name: "Oybek Ergashev", group: "MG-202", experimentType: "control", taskMode: "optional", scores: [55, 58, 61, 63, 67, 72], firstAttempt: 64, secondAttempt: 71, criteria: [75, 72, 73, 74, 70] },
  { id: 11, name: "Shahnoza Qodirova", group: "MG-202", experimentType: "control", taskMode: "etalon", scores: [51, 54, 57, 60, 64, 69], firstAttempt: 61, secondAttempt: 68, criteria: [71, 70, 69, 72, 68] },
  { id: 12, name: "Temur Gʻaniyev", group: "MG-202", experimentType: "control", taskMode: "optional", scores: [44, 48, 51, 55, 58, 64], firstAttempt: 55, secondAttempt: 63, criteria: [67, 64, 66, 68, 63] },
];

const scoreLabels = ["Boshlang‘ich", "1-hafta", "2-hafta", "3-hafta", "4-hafta", "Yakuniy"];
const criteriaLabels = ["Proyeksiya", "O‘lcham", "Chiziqlar", "Aniqlik", "Standart"];

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function averageSeries(items: StudentAnalytics[]) {
  return scoreLabels.map((_, index) => average(items.map((item) => item.scores[index])));
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
  icon: React.ReactNode;
  positive?: boolean;
}) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold tracking-tight">{value}</div>
        <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
          {positive === true ? <ArrowUpRight className="h-3.5 w-3.5 text-emerald-600" /> : null}
          {positive === false ? <ArrowDownRight className="h-3.5 w-3.5 text-red-600" /> : null}
          {hint}
        </div>
      </CardContent>
    </Card>
  );
}

const selectClass = "h-10 w-full rounded-md border bg-background px-3 text-sm outline-none transition focus:ring-2 focus:ring-ring";

export default function AnalyticsPage() {
  const [group, setGroup] = useState("all");
  const [studentId, setStudentId] = useState("all");
  const [experimentType, setExperimentType] = useState("all");
  const [taskMode, setTaskMode] = useState("all");

  const groups = useMemo(() => [...new Set(students.map((item) => item.group))], []);

  const studentOptions = useMemo(() => {
    return students.filter((item) => group === "all" || item.group === group);
  }, [group]);

  const filtered = useMemo(() => {
    return students.filter((item) => {
      if (group !== "all" && item.group !== group) return false;
      if (studentId !== "all" && item.id !== Number(studentId)) return false;
      if (experimentType !== "all" && item.experimentType !== experimentType) return false;
      if (taskMode !== "all" && item.taskMode !== taskMode) return false;
      return true;
    });
  }, [experimentType, group, studentId, taskMode]);

  const scope = filtered.length ? filtered : students;
  const scopeSeries = averageSeries(scope);
  const allSeries = averageSeries(students);
  const initialAverage = average(scope.map((item) => item.scores[0]));
  const finalAverage = average(scope.map((item) => item.scores[5]));
  const growth = finalAverage - initialAverage;
  const secondAttemptGrowth = average(scope.map((item) => item.secondAttempt - item.firstAttempt));
  const successRate = (scope.filter((item) => item.scores[5] >= 71).length / scope.length) * 100;

  const groupComparison = useMemo(() => {
    return groups.map((groupName) => {
      const rows = students.filter((item) => item.group === groupName);
      return {
        label: groupName,
        before: average(rows.map((item) => item.scores[0])),
        after: average(rows.map((item) => item.scores[5])),
      };
    });
  }, [groups]);

  const distribution = [
    { label: "Yuqori (86–100)", value: scope.filter((item) => item.scores[5] >= 86).length, color: "#16a34a" },
    { label: "Yaxshi (71–85)", value: scope.filter((item) => item.scores[5] >= 71 && item.scores[5] < 86).length, color: "#2563eb" },
    { label: "Qoniqarli (56–70)", value: scope.filter((item) => item.scores[5] >= 56 && item.scores[5] < 71).length, color: "#d97706" },
    { label: "Past (0–55)", value: scope.filter((item) => item.scores[5] < 56).length, color: "#dc2626" },
  ];

  const criteriaAverages = criteriaLabels.map((_, index) => average(scope.map((item) => item.criteria[index])));
  const heatmapRows = scope.slice(0, 12).map((item) => ({ name: item.name, values: [...item.scores] }));

  const scopeLabel = studentId !== "all"
    ? scope[0]?.name || "Tanlangan talaba"
    : group !== "all"
      ? `${group} guruhi`
      : experimentType === "experimental"
        ? "Tajriba guruhlari"
        : experimentType === "control"
          ? "Nazorat guruhlari"
          : "Barcha talabalar";

  function resetFilters() {
    setGroup("all");
    setStudentId("all");
    setExperimentType("all");
    setTaskMode("all");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
            <Badge variant="secondary">Frontend demo ma’lumotlari</Badge>
          </div>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
            O‘qituvchi o‘zi biriktirgan talabalar natijalarini talaba, guruh, tajriba turi va topshiriq rejimi bo‘yicha tahlil qiladi.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={resetFilters}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Filtrlarni tozalash
        </Button>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Tahlil filtrlari</CardTitle>
          <p className="text-sm text-muted-foreground">Filtrlar o‘zgarganda barcha metrikalar va diagrammalar dinamik yangilanadi.</p>
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
              {groups.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>

          <label className="space-y-2 text-sm font-medium">
            <span>Talaba</span>
            <select className={selectClass} value={studentId} onChange={(event) => setStudentId(event.target.value)}>
              <option value="all">Barcha talabalar</option>
              {studentOptions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>

          <label className="space-y-2 text-sm font-medium">
            <span>Tajriba-sinov turi</span>
            <select className={selectClass} value={experimentType} onChange={(event) => setExperimentType(event.target.value)}>
              <option value="all">Barchasi</option>
              <option value="experimental">Tajriba guruhi</option>
              <option value="control">Nazorat guruhi</option>
            </select>
          </label>

          <label className="space-y-2 text-sm font-medium">
            <span>Topshiriq rejimi</span>
            <select className={selectClass} value={taskMode} onChange={(event) => setTaskMode(event.target.value)}>
              <option value="all">Barcha rejimlar</option>
              <option value="etalon">Etalon</option>
              <option value="optional">Ixtiyoriy</option>
            </select>
          </label>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Tanlangan talabalar" value={String(scope.length)} hint={scopeLabel} icon={<Users className="h-4 w-4" />} />
        <MetricCard title="Yakuniy o‘rtacha" value={`${finalAverage.toFixed(1)}/100`} hint={`Boshlang‘ich: ${initialAverage.toFixed(1)}`} icon={<Target className="h-4 w-4" />} positive={growth >= 0} />
        <MetricCard title="Umumiy o‘sish" value={`${growth >= 0 ? "+" : ""}${growth.toFixed(1)}`} hint="Boshlang‘ichdan yakuniygacha" icon={<TrendingUp className="h-4 w-4" />} positive={growth >= 0} />
        <MetricCard title="Muvaffaqiyat" value={`${successRate.toFixed(0)}%`} hint={`2-urinish o‘sishi: +${secondAttemptGrowth.toFixed(1)}`} icon={<BarChart3 className="h-4 w-4" />} positive={successRate >= 70} />
      </div>

      <ChartCard
        title="Natijaning davrlar bo‘yicha o‘zgarishi"
        description="Boshlang‘ich diagnostikadan yakuniy nazoratgacha bo‘lgan dinamik o‘sish yoki pasayish."
        chartId="progress-line-chart"
        filename="natijalar-dinamikasi"
      >
        <LineProgressChart
          id="progress-line-chart"
          labels={scoreLabels}
          values={scopeSeries}
          comparisonValues={studentId === "all" && group === "all" && experimentType === "all" && taskMode === "all" ? undefined : allSeries}
          mainLabel={scopeLabel}
          comparisonLabel={studentId === "all" && group === "all" && experimentType === "all" && taskMode === "all" ? undefined : "Umumiy o‘rtacha"}
        />
      </ChartCard>

      <div className="grid gap-6 2xl:grid-cols-2">
        <ChartCard
          title="Guruhlar bo‘yicha boshlang‘ich va yakuniy natija"
          description="Har bir guruhning tajriba-sinov boshidagi va yakunidagi o‘rtacha ballari."
          chartId="group-bar-chart"
          filename="guruhlar-solishtiruvi"
        >
          <GroupBarChart id="group-bar-chart" data={groupComparison} />
        </ChartCard>

        <ChartCard
          title="Yakuniy natijalar taqsimoti"
          description="Tanlangan kesimdagi talabalar natijalarining sifat darajalari bo‘yicha ulushi."
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
          <RadarChart id="criteria-radar-chart" labels={criteriaLabels} values={criteriaAverages} />
        </ChartCard>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Ilmiy-metodik xulosa</CardTitle>
            <p className="text-sm text-muted-foreground">Tanlangan kesim bo‘yicha avtomatik shakllangan qisqa tahlil.</p>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-6">
            <div className="rounded-xl border bg-muted/20 p-4">
              <strong>{scopeLabel}</strong> bo‘yicha boshlang‘ich o‘rtacha natija <strong>{initialAverage.toFixed(1)}</strong> ball,
              yakuniy natija esa <strong>{finalAverage.toFixed(1)}</strong> ballni tashkil etdi.
            </div>
            <div className="rounded-xl border bg-muted/20 p-4">
              Umumiy o‘zgarish <strong>{growth >= 0 ? "+" : ""}{growth.toFixed(1)}</strong> ball. Ikkinchi urinish natijalari birinchi urinishga
              nisbatan o‘rtacha <strong>+{secondAttemptGrowth.toFixed(1)}</strong> ballga yaxshilangan.
            </div>
            <div className="rounded-xl border bg-muted/20 p-4">
              71 va undan yuqori ball olgan talabalar ulushi <strong>{successRate.toFixed(0)}%</strong>. Backend ulanganidan keyin ushbu xulosa real
              topshiriqlar, sanalar va guruhlar asosida avtomatik shakllanadi.
            </div>
          </CardContent>
        </Card>
      </div>

      <ChartCard
        title="Talabalar kesimidagi natijalar xaritasi"
        description="Har bir talabaning bosqichlar bo‘yicha ballari rangli heatmap shaklida."
        chartId="student-heatmap-chart"
        filename="talabalar-heatmap"
      >
        <HeatmapChart id="student-heatmap-chart" rows={heatmapRows} columns={scoreLabels} />
      </ChartCard>
    </div>
  );
}
