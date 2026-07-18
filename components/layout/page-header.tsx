import type { ComponentType, ReactNode } from 'react';
import { cn } from '@/lib/utils';

type HeaderMetric = {
  label: string;
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

function PageHeaderDecoration({ variant }: { variant: keyof typeof headerVariants }) {
  const colors = headerVariants[variant];
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
        d="M -120 126 C 160 62, 425 72, 690 99 C 935 124, 1115 128, 1365 78 C 1500 51, 1595 50, 1700 66 L 1700 116 C 1495 101, 1348 113, 1138 141 C 885 175, 658 137, 430 113 C 205 90, 18 101, -120 146 Z"
        fill={`url(#${ribbonId})`}
        opacity="0.8"
      />
      <path
        d="M -80 116 C 230 60, 510 70, 780 98 C 1035 125, 1240 103, 1685 58"
        fill="none"
        stroke={`url(#${lineId})`}
        strokeWidth="1.1"
        vectorEffect="non-scaling-stroke"
      />
      <path
        d="M 1050 154 A 142 120 0 0 1 1334 154"
        fill="none"
        stroke={`url(#${lineId})`}
        strokeWidth="1.25"
        opacity="0.58"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export function PageHeader({
  eyebrow,
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
          className="relative isolate overflow-hidden p-6 text-white sm:p-7"
          style={{ background: colors.background }}
        >
          <PageHeaderDecoration variant={variant} />
          <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/72">{eyebrow}</p>
              <h1 className="mt-2 text-3xl font-semibold leading-tight tracking-normal text-white">{title}</h1>
              <p className="mt-2 text-sm leading-6 text-white/84">{description}</p>
            </div>
            {actions ? <div className="flex shrink-0 justify-end">{actions}</div> : null}
          </div>
        </div>
      </section>

      {metrics.length ? (
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <div
              key={metric.label}
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
                <p className="text-sm font-semibold leading-5">{metric.label}</p>
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
