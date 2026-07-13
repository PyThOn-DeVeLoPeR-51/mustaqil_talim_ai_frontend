"use client";

const COLORS = {
  blue: "#2563eb",
  blueLight: "#dbeafe",
  green: "#16a34a",
  greenLight: "#dcfce7",
  amber: "#d97706",
  amberLight: "#fef3c7",
  red: "#dc2626",
  redLight: "#fee2e2",
  slate: "#475569",
  grid: "#e2e8f0",
  text: "#334155",
  muted: "#64748b",
  white: "#ffffff",
};

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function scoreColor(score: number) {
  if (score >= 86) return COLORS.green;
  if (score >= 71) return COLORS.blue;
  if (score >= 56) return COLORS.amber;
  return COLORS.red;
}

export function LineProgressChart({
  id,
  labels,
  values,
  comparisonValues,
  mainLabel,
  comparisonLabel,
}: {
  id: string;
  labels: string[];
  values: number[];
  comparisonValues?: number[];
  mainLabel: string;
  comparisonLabel?: string;
}) {
  const width = 940;
  const height = 390;
  const left = 66;
  const right = 30;
  const top = 42;
  const bottom = 72;
  const innerWidth = width - left - right;
  const innerHeight = height - top - bottom;
  const x = (index: number) => left + (index * innerWidth) / Math.max(labels.length - 1, 1);
  const y = (value: number) => top + innerHeight - (clamp(value) / 100) * innerHeight;
  const points = values.map((value, index) => `${x(index)},${y(value)}`).join(" ");
  const comparisonPoints = comparisonValues
    ?.map((value, index) => `${x(index)},${y(value)}`)
    .join(" ");

  return (
    <svg id={id} viewBox={`0 0 ${width} ${height}`} className="min-w-[760px] w-full" role="img">
      <rect width={width} height={height} fill={COLORS.white} />
      {[0, 20, 40, 60, 80, 100].map((tick) => (
        <g key={tick}>
          <line x1={left} x2={width - right} y1={y(tick)} y2={y(tick)} stroke={COLORS.grid} strokeWidth="1" />
          <text x={left - 14} y={y(tick) + 5} textAnchor="end" fontSize="12" fill={COLORS.muted}>
            {tick}
          </text>
        </g>
      ))}

      {labels.map((label, index) => (
        <text key={label} x={x(index)} y={height - 34} textAnchor="middle" fontSize="12" fill={COLORS.text}>
          {label}
        </text>
      ))}

      {comparisonPoints ? (
        <polyline points={comparisonPoints} fill="none" stroke={COLORS.slate} strokeWidth="3" strokeDasharray="8 7" />
      ) : null}
      <polyline points={points} fill="none" stroke={COLORS.blue} strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" />

      {values.map((value, index) => (
        <g key={`${index}-${value}`}>
          <circle cx={x(index)} cy={y(value)} r="6" fill={COLORS.white} stroke={COLORS.blue} strokeWidth="4" />
          <text x={x(index)} y={y(value) - 13} textAnchor="middle" fontSize="12" fontWeight="700" fill={COLORS.blue}>
            {Math.round(value)}
          </text>
        </g>
      ))}

      {comparisonValues?.map((value, index) => (
        <circle key={`comparison-${index}`} cx={x(index)} cy={y(value)} r="4" fill={COLORS.slate} />
      ))}

      <g transform={`translate(${left}, 20)`}>
        <line x1="0" x2="28" y1="0" y2="0" stroke={COLORS.blue} strokeWidth="4" />
        <text x="36" y="5" fontSize="12" fill={COLORS.text}>{mainLabel}</text>
        {comparisonLabel ? (
          <>
            <line x1="230" x2="258" y1="0" y2="0" stroke={COLORS.slate} strokeWidth="3" strokeDasharray="7 5" />
            <text x="266" y="5" fontSize="12" fill={COLORS.text}>{comparisonLabel}</text>
          </>
        ) : null}
      </g>
    </svg>
  );
}

export function GroupBarChart({
  id,
  data,
}: {
  id: string;
  data: Array<{ label: string; before: number; after: number }>;
}) {
  const width = 940;
  const height = 390;
  const left = 64;
  const right = 28;
  const top = 54;
  const bottom = 70;
  const innerWidth = width - left - right;
  const innerHeight = height - top - bottom;
  const groupWidth = innerWidth / Math.max(data.length, 1);
  const barWidth = Math.min(74, groupWidth * 0.28);
  const y = (value: number) => top + innerHeight - (clamp(value) / 100) * innerHeight;

  return (
    <svg id={id} viewBox={`0 0 ${width} ${height}`} className="min-w-[760px] w-full" role="img">
      <rect width={width} height={height} fill={COLORS.white} />
      {[0, 20, 40, 60, 80, 100].map((tick) => (
        <g key={tick}>
          <line x1={left} x2={width - right} y1={y(tick)} y2={y(tick)} stroke={COLORS.grid} />
          <text x={left - 14} y={y(tick) + 5} textAnchor="end" fontSize="12" fill={COLORS.muted}>{tick}</text>
        </g>
      ))}

      {data.map((item, index) => {
        const center = left + groupWidth * index + groupWidth / 2;
        const beforeX = center - barWidth - 6;
        const afterX = center + 6;
        return (
          <g key={item.label}>
            <rect x={beforeX} y={y(item.before)} width={barWidth} height={top + innerHeight - y(item.before)} rx="8" fill={COLORS.slate} />
            <rect x={afterX} y={y(item.after)} width={barWidth} height={top + innerHeight - y(item.after)} rx="8" fill={COLORS.blue} />
            <text x={beforeX + barWidth / 2} y={y(item.before) - 10} textAnchor="middle" fontSize="12" fontWeight="700" fill={COLORS.slate}>{Math.round(item.before)}</text>
            <text x={afterX + barWidth / 2} y={y(item.after) - 10} textAnchor="middle" fontSize="12" fontWeight="700" fill={COLORS.blue}>{Math.round(item.after)}</text>
            <text x={center} y={height - 34} textAnchor="middle" fontSize="13" fill={COLORS.text}>{item.label}</text>
          </g>
        );
      })}

      <g transform={`translate(${left}, 24)`}>
        <rect width="18" height="12" rx="3" fill={COLORS.slate} />
        <text x="26" y="11" fontSize="12" fill={COLORS.text}>Boshlang‘ich</text>
        <rect x="145" width="18" height="12" rx="3" fill={COLORS.blue} />
        <text x="171" y="11" fontSize="12" fill={COLORS.text}>Yakuniy</text>
      </g>
    </svg>
  );
}

export function DonutChart({
  id,
  values,
}: {
  id: string;
  values: Array<{ label: string; value: number; color: string }>;
}) {
  const width = 760;
  const height = 390;
  const cx = 235;
  const cy = 196;
  const radius = 112;
  const strokeWidth = 52;
  const circumference = 2 * Math.PI * radius;
  const total = Math.max(1, values.reduce((sum, item) => sum + item.value, 0));
  const segments = values.map((item, index) => {
    const previous = values.slice(0, index).reduce((sum, row) => sum + row.value, 0);
    const portion = item.value / total;
    return {
      ...item,
      dash: portion * circumference,
      offset: -(previous / total) * circumference,
    };
  });

  return (
    <svg id={id} viewBox={`0 0 ${width} ${height}`} className="min-w-[620px] w-full" role="img">
      <rect width={width} height={height} fill={COLORS.white} />
      <circle cx={cx} cy={cy} r={radius} fill="none" stroke={COLORS.grid} strokeWidth={strokeWidth} />
      {segments.map((item) => (
        <circle
          key={item.label}
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke={item.color}
          strokeWidth={strokeWidth}
          strokeDasharray={`${item.dash} ${circumference - item.dash}`}
          strokeDashoffset={item.offset}
          transform={`rotate(-90 ${cx} ${cy})`}
        />
      ))}
      <text x={cx} y={cy - 2} textAnchor="middle" fontSize="38" fontWeight="700" fill={COLORS.text}>{total}</text>
      <text x={cx} y={cy + 25} textAnchor="middle" fontSize="13" fill={COLORS.muted}>talaba</text>

      <g transform="translate(430, 80)">
        {values.map((item, index) => {
          const percent = Math.round((item.value / total) * 100);
          return (
            <g key={item.label} transform={`translate(0, ${index * 62})`}>
              <rect width="18" height="18" rx="5" fill={item.color} />
              <text x="30" y="14" fontSize="14" fontWeight="600" fill={COLORS.text}>{item.label}</text>
              <text x="30" y="36" fontSize="12" fill={COLORS.muted}>{item.value} nafar • {percent}%</text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}

export function RadarChart({
  id,
  labels,
  values,
}: {
  id: string;
  labels: string[];
  values: number[];
}) {
  const width = 760;
  const height = 430;
  const cx = 380;
  const cy = 215;
  const radius = 145;
  const count = labels.length;
  const point = (index: number, ratio: number) => {
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / count;
    return {
      x: cx + Math.cos(angle) * radius * ratio,
      y: cy + Math.sin(angle) * radius * ratio,
    };
  };
  const polygon = (ratio: number) => labels.map((_, index) => {
    const p = point(index, ratio);
    return `${p.x},${p.y}`;
  }).join(" ");
  const valuePolygon = values.map((value, index) => {
    const p = point(index, clamp(value) / 100);
    return `${p.x},${p.y}`;
  }).join(" ");

  return (
    <svg id={id} viewBox={`0 0 ${width} ${height}`} className="min-w-[620px] w-full" role="img">
      <rect width={width} height={height} fill={COLORS.white} />
      {[0.2, 0.4, 0.6, 0.8, 1].map((ratio) => (
        <polygon key={ratio} points={polygon(ratio)} fill="none" stroke={COLORS.grid} strokeWidth="1" />
      ))}
      {labels.map((label, index) => {
        const edge = point(index, 1);
        const textPoint = point(index, 1.17);
        const valuePoint = point(index, clamp(values[index]) / 100);
        return (
          <g key={label}>
            <line x1={cx} y1={cy} x2={edge.x} y2={edge.y} stroke={COLORS.grid} />
            <text x={textPoint.x} y={textPoint.y} textAnchor="middle" dominantBaseline="middle" fontSize="12" fill={COLORS.text}>{label}</text>
            <circle cx={valuePoint.x} cy={valuePoint.y} r="5" fill={COLORS.blue} />
          </g>
        );
      })}
      <polygon points={valuePolygon} fill={COLORS.blueLight} fillOpacity="0.75" stroke={COLORS.blue} strokeWidth="3" />
      <text x="22" y="28" fontSize="12" fill={COLORS.muted}>Rubrika mezonlari bo‘yicha o‘rtacha natija (%)</text>
    </svg>
  );
}

export function HeatmapChart({
  id,
  rows,
  columns,
}: {
  id: string;
  rows: Array<{ name: string; values: number[] }>;
  columns: string[];
}) {
  const width = 980;
  const left = 180;
  const top = 62;
  const cellWidth = 120;
  const cellHeight = 46;
  const height = top + rows.length * cellHeight + 62;

  return (
    <svg id={id} viewBox={`0 0 ${width} ${height}`} className="min-w-[840px] w-full" role="img">
      <rect width={width} height={height} fill={COLORS.white} />
      {columns.map((column, index) => (
        <text key={column} x={left + index * cellWidth + cellWidth / 2} y={36} textAnchor="middle" fontSize="12" fontWeight="600" fill={COLORS.text}>{column}</text>
      ))}
      {rows.map((row, rowIndex) => (
        <g key={row.name}>
          <text x={left - 16} y={top + rowIndex * cellHeight + 29} textAnchor="end" fontSize="12" fill={COLORS.text}>{row.name}</text>
          {row.values.map((value, columnIndex) => (
            <g key={`${row.name}-${columnIndex}`}>
              <rect
                x={left + columnIndex * cellWidth + 4}
                y={top + rowIndex * cellHeight + 4}
                width={cellWidth - 8}
                height={cellHeight - 8}
                rx="8"
                fill={scoreColor(value)}
                fillOpacity="0.88"
              />
              <text
                x={left + columnIndex * cellWidth + cellWidth / 2}
                y={top + rowIndex * cellHeight + 29}
                textAnchor="middle"
                fontSize="12"
                fontWeight="700"
                fill={COLORS.white}
              >
                {Math.round(value)}
              </text>
            </g>
          ))}
        </g>
      ))}
      <g transform={`translate(${left}, ${height - 28})`}>
        {[{ label: "Past", color: COLORS.red }, { label: "Qoniqarli", color: COLORS.amber }, { label: "Yaxshi", color: COLORS.blue }, { label: "Yuqori", color: COLORS.green }].map((item, index) => (
          <g key={item.label} transform={`translate(${index * 150}, 0)`}>
            <rect width="16" height="16" rx="4" fill={item.color} />
            <text x="24" y="13" fontSize="12" fill={COLORS.text}>{item.label}</text>
          </g>
        ))}
      </g>
    </svg>
  );
}
