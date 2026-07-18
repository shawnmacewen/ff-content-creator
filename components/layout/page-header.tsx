import type { ComponentType, ReactNode } from 'react';
import { cn } from '@/lib/utils';

type HeaderMetric = {
  id?: string;
  label: ReactNode;
  detail?: ReactNode;
  icon: ComponentType<{ className?: string }>;
  active?: boolean;
  iconClassName?: string;
  trailing?: ReactNode;
};

type PageHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
  metrics: HeaderMetric[];
  actions?: ReactNode;
  className?: string;
  variant?: 'teal' | 'pink' | 'yellow' | 'violet' | 'emerald' | 'red';
};

const headerVariants = {
  teal: {
    background: 'linear-gradient(108deg, #10233e 0%, #143a7b 50%, #0f6f8f 100%)',
    ribbon: '#49aaa6',
    line: '#9dd9d2',
  },
  pink: {
    background: 'linear-gradient(108deg, #10233e 0%, #143a7b 46%, #8f4d79 78%, #d66f9c 112%)',
    ribbon: '#d66f9c',
    line: '#f0abc8',
  },
  yellow: {
    background: 'linear-gradient(108deg, #10233e 0%, #143a7b 48%, #8e6b32 78%, #d6a35d 112%)',
    ribbon: '#d6a35d',
    line: '#f0ce86',
  },
  violet: {
    background: 'linear-gradient(108deg, #10233e 0%, #143a7b 48%, #5f579f 78%, #9a7ed8 112%)',
    ribbon: '#9a7ed8',
    line: '#c8b7ef',
  },
  emerald: {
    background: 'linear-gradient(108deg, #10233e 0%, #143a7b 48%, #276c68 78%, #42a878 112%)',
    ribbon: '#42a878',
    line: '#9cd8b4',
  },
  red: {
    background: 'linear-gradient(108deg, #10233e 0%, #143a7b 48%, #7d465f 78%, #bf4c56 112%)',
    ribbon: '#bf4c56',
    line: '#f1a0a7',
  },
};

const headerAccentPaths: Record<keyof typeof headerVariants, {
  ribbon: string;
  lines: { d: string; width: number; opacity: number }[];
}> = {
  teal: {
    ribbon: 'M -100 118 C 130 88, 302 98, 500 126 C 710 156, 874 140, 1036 102 C 1220 58, 1394 62, 1700 118 L 1700 150 C 1398 108, 1238 102, 1058 132 C 862 165, 694 168, 486 145 C 270 122, 98 124, -100 148 Z',
    lines: [
      { d: 'M 120 112 C 278 70, 432 82, 594 106 C 748 129, 842 102, 968 58', width: 1.2, opacity: 0.74 },
      { d: 'M 1018 120 C 1128 72, 1242 72, 1360 98 C 1472 122, 1548 100, 1638 58', width: 1, opacity: 0.58 },
      { d: 'M 248 76 C 276 96, 286 116, 280 138 M 604 52 C 640 74, 654 98, 644 126 M 1220 58 C 1262 82, 1278 106, 1268 132 M 1410 44 C 1456 72, 1474 96, 1462 124', width: 0.75, opacity: 0.36 },
    ],
  },
  pink: {
    ribbon: 'M -90 34 C 205 78, 428 83, 688 58 C 930 35, 1110 45, 1328 91 C 1480 123, 1590 123, 1700 96 L 1700 138 C 1510 155, 1365 137, 1196 104 C 982 63, 818 66, 616 96 C 378 131, 142 107, -90 56 Z',
    lines: [
      { d: 'M 92 42 C 355 91, 568 92, 802 62 C 1042 31, 1244 57, 1538 114', width: 1.2, opacity: 0.74 },
      { d: 'M 1204 26 L 1390 96 M 1292 19 L 1478 89', width: 0.85, opacity: 0.42 },
    ],
  },
  yellow: {
    ribbon: 'M -120 118 C 108 88, 312 92, 520 116 C 734 141, 892 128, 1080 82 C 1260 39, 1450 42, 1700 92 L 1700 140 C 1458 103, 1282 98, 1106 128 C 882 166, 698 154, 498 133 C 274 109, 82 119, -120 150 Z',
    lines: [
      { d: 'M 0 112 L 1600 112', width: 0.9, opacity: 0.5 },
      { d: 'M 1030 148 A 210 154 0 0 1 1450 148 M 1102 148 A 138 102 0 0 1 1378 148', width: 1.05, opacity: 0.62 },
    ],
  },
  violet: {
    ribbon: 'M -80 148 C 170 66, 404 38, 670 66 C 918 92, 1066 139, 1310 126 C 1470 118, 1580 88, 1700 44 L 1700 88 C 1528 134, 1390 154, 1216 152 C 1002 150, 850 103, 660 86 C 420 64, 226 92, -80 166 Z',
    lines: [
      { d: 'M -50 142 C 225 68, 430 50, 670 76 C 918 104, 1100 144, 1392 118', width: 1.15, opacity: 0.7 },
      { d: 'M 1046 118 C 1118 76, 1202 62, 1294 78 C 1388 94, 1460 78, 1540 34', width: 0.9, opacity: 0.48 },
    ],
  },
  emerald: {
    ribbon: 'M -110 68 C 142 96, 326 134, 564 117 C 786 101, 884 43, 1106 44 C 1310 45, 1472 92, 1700 122 L 1700 152 C 1444 132, 1298 98, 1110 88 C 906 77, 750 126, 552 143 C 326 162, 126 117, -110 92 Z',
    lines: [
      { d: 'M 80 72 C 330 122, 516 136, 720 104 C 930 70, 1072 34, 1324 76', width: 1.15, opacity: 0.7 },
      { d: 'M 1120 42 C 1226 58, 1326 94, 1422 138 M 1180 32 C 1278 72, 1358 112, 1428 154', width: 0.85, opacity: 0.5 },
    ],
  },
  red: {
    ribbon: 'M -90 132 C 118 80, 286 62, 510 75 C 742 88, 872 130, 1084 137 C 1312 144, 1478 94, 1700 42 L 1700 92 C 1492 134, 1322 164, 1088 160 C 874 156, 714 112, 506 100 C 282 87, 108 106, -90 152 Z',
    lines: [
      { d: 'M 130 118 C 350 58, 560 68, 780 104 C 1012 142, 1238 144, 1548 62', width: 1.2, opacity: 0.72 },
      { d: 'M 1118 60 L 1218 130 L 1322 54 L 1436 120', width: 0.95, opacity: 0.5 },
    ],
  },
};

function PageHeaderDecoration({ variant }: { variant: keyof typeof headerVariants }) {
  const colors = headerVariants[variant];
  const accents = headerAccentPaths[variant];
  const ribbonId = `page-header-ribbon-${variant}`;
  const lineId = `page-header-line-${variant}`;

  return (
    <svg
      className="pointer-events-none absolute inset-0 z-0 h-full w-full"
      viewBox="0 0 1600 150"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={ribbonId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={colors.ribbon} stopOpacity="0" />
          <stop offset="38%" stopColor={colors.ribbon} stopOpacity="0.23" />
          <stop offset="72%" stopColor={colors.line} stopOpacity="0.3" />
          <stop offset="100%" stopColor={colors.line} stopOpacity="0" />
        </linearGradient>
        <linearGradient id={lineId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={colors.ribbon} stopOpacity="0" />
          <stop offset="44%" stopColor={colors.ribbon} stopOpacity="0.46" />
          <stop offset="90%" stopColor={colors.line} stopOpacity="0.7" />
          <stop offset="100%" stopColor={colors.line} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={accents.ribbon}
        fill={`url(#${ribbonId})`}
        opacity="0.8"
      />
      {accents.lines.map((line) => (
        <path
          key={line.d}
          d={line.d}
          fill="none"
          stroke={`url(#${lineId})`}
          strokeWidth={line.width}
          opacity={line.opacity}
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  );
}

export function PageHeader({
  title,
  description,
  metrics,
  actions,
  className,
  variant = 'teal',
}: PageHeaderProps) {
  const colors = headerVariants[variant];

  return (
    <>
      <section className={cn('overflow-hidden rounded-lg border border-border bg-card shadow-sm', className)}>
        <div
          className="relative isolate flex h-[132px] overflow-hidden px-6 py-5 text-white sm:px-7"
          style={{ background: colors.background }}
        >
          <PageHeaderDecoration variant={variant} />
          <div className="relative z-10 flex w-full flex-col justify-center gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-3xl">
              <h1 className="text-3xl font-semibold leading-tight tracking-normal text-white">{title}</h1>
              <p className="mt-2 line-clamp-2 text-sm leading-6 text-white/84">{description}</p>
            </div>
            {actions ? <div className="flex shrink-0 justify-end">{actions}</div> : null}
          </div>
        </div>
      </section>

      {metrics.length ? (
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <div
              key={metric.id || String(metric.label)}
              className="flex min-h-24 items-start gap-3 rounded-lg border border-border bg-card p-4 shadow-sm"
            >
              <span
                className={cn(
                  'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md',
                  metric.active === false
                    ? 'bg-muted text-muted-foreground'
                    : metric.iconClassName || 'bg-primary text-primary-foreground'
                )}
              >
                <metric.icon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold leading-5">{metric.label}</div>
                {metric.detail ? (
                  <div className="mt-0.5 text-xs leading-5 text-muted-foreground">{metric.detail}</div>
                ) : null}
              </div>
              {metric.trailing ? <div className="shrink-0">{metric.trailing}</div> : null}
            </div>
          ))}
        </section>
      ) : null}
    </>
  );
}
