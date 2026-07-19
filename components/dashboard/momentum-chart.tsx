'use client';

import { useMemo, useState } from 'react';

type MomentumDay = {
  date: string;
  label: string;
  articles: number;
  images: number;
  total: number;
};

type SeriesKey = 'articles' | 'images' | 'total';

type TooltipState = {
  day: MomentumDay;
  x: number;
  y: number;
} | null;

const SERIES = {
  articles: {
    label: 'Articles',
    color: '#9257e8',
    soft: '#f3ecff',
  },
  images: {
    label: 'Images',
    color: '#38bdf8',
    soft: '#e0f7ff',
  },
  total: {
    label: 'Total',
    color: '#2563eb',
    soft: '#dbeafe',
  },
} satisfies Record<SeriesKey, { label: string; color: string; soft: string }>;

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US').format(Math.round(value || 0));
}

function makeSmoothPath(points: Array<{ x: number; y: number }>) {
  if (!points.length) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  return points.reduce((path, point, index) => {
    if (index === 0) return `M ${point.x} ${point.y}`;

    const previous = points[index - 1];
    const next = points[index + 1] || point;
    const beforePrevious = points[index - 2] || previous;
    const controlOneX = previous.x + (point.x - beforePrevious.x) / 6;
    const controlOneY = previous.y + (point.y - beforePrevious.y) / 6;
    const controlTwoX = point.x - (next.x - previous.x) / 6;
    const controlTwoY = point.y - (next.y - previous.y) / 6;

    return `${path} C ${controlOneX} ${controlOneY}, ${controlTwoX} ${controlTwoY}, ${point.x} ${point.y}`;
  }, '');
}

function getLabelStep(length: number) {
  if (length <= 7) return 1;
  if (length <= 30) return 7;
  return 15;
}

function getCountStep(maxValue: number) {
  if (maxValue <= 60) return 10;
  if (maxValue <= 150) return 25;
  return 50;
}

function roundUpToStep(value: number, step: number) {
  return Math.max(step, Math.ceil(value / step) * step);
}

function getLabelIndexes(length: number, labelStep: number) {
  const indexes = new Set<number>();
  for (let index = 0; index < length; index += labelStep) indexes.add(index);

  if (length > 0) {
    indexes.delete(length - 2);
    indexes.add(length - 1);
  }

  return indexes;
}

export function MomentumChart({ daily, rangeDays }: { daily: MomentumDay[]; rangeDays: number }) {
  const [visible, setVisible] = useState<Record<SeriesKey, boolean>>({
    articles: true,
    images: true,
    total: true,
  });
  const [tooltip, setTooltip] = useState<TooltipState>(null);

  const width = 780;
  const height = 270;
  const chartLeft = 58;
  const chartRight = 28;
  const chartTop = 24;
  const chartHeight = 176;
  const chartBottom = chartTop + chartHeight;
  const isLineOnly = rangeDays >= 90;

  const { maxValue, countTicks, points, barWidth, labelIndexes } = useMemo(() => {
    const rawMaxTotal = Math.max(10, ...daily.map((day) => day.total));
    const nextCountStep = getCountStep(rawMaxTotal);
    const maxTotal = roundUpToStep(rawMaxTotal, nextCountStep);
    const chartWidth = width - chartLeft - chartRight;
    const step = daily.length > 1 ? chartWidth / (daily.length - 1) : chartWidth;
    const barStep = daily.length ? chartWidth / daily.length : chartWidth;
    const nextBarWidth = rangeDays <= 7
      ? Math.min(58, barStep * 0.62)
      : rangeDays <= 30
        ? Math.min(20, barStep * 0.72)
        : Math.max(2.5, Math.min(5, barStep * 0.6));

    return {
      maxValue: maxTotal,
      countTicks: Array.from({ length: Math.floor(maxTotal / nextCountStep) + 1 }, (_, index) => index * nextCountStep),
      labelIndexes: getLabelIndexes(daily.length, getLabelStep(daily.length)),
      barWidth: nextBarWidth,
      points: daily.map((day, index) => {
        const x = daily.length > 1 ? chartLeft + index * step : chartLeft + chartWidth / 2;
        const barX = chartLeft + index * barStep + barStep / 2;
        const y = chartBottom - (day.total / maxTotal) * chartHeight;
        const articleY = chartBottom - (day.articles / maxTotal) * chartHeight;
        const imageY = chartBottom - (day.images / maxTotal) * chartHeight;
        return { day, x, barX, y, articleY, imageY };
      }),
    };
  }, [chartBottom, chartHeight, daily, rangeDays]);

  const totalPath = makeSmoothPath(points.map(({ x, y }) => ({ x, y })));
  const articlePath = makeSmoothPath(points.map(({ x, articleY }) => ({ x, y: articleY })));
  const imagePath = makeSmoothPath(points.map(({ x, imageY }) => ({ x, y: imageY })));

  function toggleSeries(key: SeriesKey) {
    setVisible((current) => ({ ...current, [key]: !current[key] }));
  }

  function renderTooltip() {
    if (!tooltip) return null;
    return (
      <div
        className="pointer-events-none absolute z-20 w-44 rounded-lg border border-slate-200 bg-white p-3 text-xs shadow-lg"
        style={{ left: tooltip.x + 14, top: tooltip.y - 24 }}
      >
        <div className="mb-2 font-bold text-slate-950">{tooltip.day.label}</div>
        <div className="space-y-1 font-semibold text-slate-600">
          <div className="flex justify-between"><span>Articles</span><span>{formatNumber(tooltip.day.articles)}</span></div>
          <div className="flex justify-between"><span>Images</span><span>{formatNumber(tooltip.day.images)}</span></div>
          <div className="flex justify-between border-t border-slate-100 pt-1 text-blue-700"><span>Total</span><span>{formatNumber(tooltip.day.total)}</span></div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="mb-4 flex flex-wrap justify-end gap-4 text-sm font-bold text-slate-700">
        {(Object.keys(SERIES) as SeriesKey[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => toggleSeries(key)}
            className={`inline-flex items-center gap-2 rounded-md px-2 py-1 transition-colors ${visible[key] ? 'text-slate-800' : 'text-slate-400'}`}
            aria-pressed={visible[key]}
          >
            {key === 'total' ? (
              <span className="h-1 w-8 rounded-full" style={{ background: visible.total ? SERIES.total.color : '#cbd5e1' }} />
            ) : (
              <span className="h-3.5 w-3.5 rounded-full" style={{ background: visible[key] ? SERIES[key].color : '#cbd5e1' }} />
            )}
            {SERIES[key].label}
          </button>
        ))}
      </div>

      {renderTooltip()}

      <svg viewBox={`0 0 ${width} ${height}`} className="h-[285px] w-full overflow-visible">
        <text x={chartLeft - 44} y={chartTop - 10} className="fill-slate-500 text-[11px] font-bold">
          Generated assets
        </text>
        {countTicks.map((tick) => {
          const y = chartBottom - (tick / maxValue) * chartHeight;
          return (
            <g key={tick}>
              <line x1={chartLeft} x2={width - chartRight} y1={y} y2={y} stroke="#e2e8f0" strokeWidth="1" />
              <text x={chartLeft - 10} y={y + 4} textAnchor="end" className="fill-slate-500 text-[11px] font-semibold">
                {formatNumber(tick)}
              </text>
            </g>
          );
        })}

        {!isLineOnly && points.map(({ day, barX }) => {
          const articleHeight = visible.articles ? Math.max(0, (day.articles / maxValue) * chartHeight) : 0;
          const imageHeight = visible.images ? Math.max(0, (day.images / maxValue) * chartHeight) : 0;
          const imageY = chartBottom - imageHeight;
          const articleY = imageY - articleHeight;

          return (
            <g
              key={day.date}
              onMouseMove={(event) => setTooltip({ day, x: event.nativeEvent.offsetX, y: event.nativeEvent.offsetY })}
              onMouseLeave={() => setTooltip(null)}
            >
              <rect x={barX - barWidth / 2} y={articleY} width={barWidth} height={articleHeight} rx="4" fill={SERIES.articles.color} opacity="0.82" />
              <rect x={barX - barWidth / 2} y={imageY} width={barWidth} height={imageHeight} rx="4" fill={SERIES.images.color} opacity="0.9" />
              <rect x={barX - Math.max(18, barWidth) / 2} y={chartTop} width={Math.max(18, barWidth)} height={chartHeight} fill="transparent" />
            </g>
          );
        })}

        {isLineOnly && visible.articles ? (
          <path d={articlePath} fill="none" stroke={SERIES.articles.color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity="0.72" />
        ) : null}
        {isLineOnly && visible.images ? (
          <path d={imagePath} fill="none" stroke={SERIES.images.color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity="0.78" />
        ) : null}
        {visible.total ? (
          <path d={totalPath} fill="none" stroke={SERIES.total.color} strokeWidth={isLineOnly ? '2.2' : '3.6'} strokeLinecap="round" strokeLinejoin="round" />
        ) : null}

        {points.map(({ day, x, y, articleY, imageY }) => (
          <g
            key={`${day.date}-points`}
            onMouseMove={(event) => setTooltip({ day, x: event.nativeEvent.offsetX, y: event.nativeEvent.offsetY })}
            onMouseLeave={() => setTooltip(null)}
          >
            {isLineOnly && visible.articles ? <circle cx={x} cy={articleY} r="3.2" fill={SERIES.articles.color} /> : null}
            {isLineOnly && visible.images ? <circle cx={x} cy={imageY} r="3.2" fill={SERIES.images.color} /> : null}
            {visible.total ? <circle cx={x} cy={y} r={isLineOnly ? '3.8' : '4.8'} fill="#ffffff" stroke={SERIES.total.color} strokeWidth="2.6" /> : null}
            <circle cx={x} cy={y} r="10" fill="transparent" />
          </g>
        ))}

        {daily.filter((_, index) => labelIndexes.has(index)).map((day, index) => {
          const originalIndex = daily.findIndex((entry) => entry.date === day.date);
          const point = points[originalIndex];
          return (
            <text key={`${day.date}-${index}`} x={point?.x || chartLeft} y={height - 20} textAnchor="middle" className="fill-slate-500 text-[12px] font-semibold">
              {day.label}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
