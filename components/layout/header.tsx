'use client';

import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { usePathname } from 'next/navigation';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/components/layout/theme-provider';
import { cn } from '@/lib/utils';

const routeLabels: Record<string, string> = {
  '/': 'Dashboard',
  '/generate': 'Generate Content',
  '/echo-write': 'EchoWrite',
  '/source-content': 'Source Content',
  '/library': 'Saved Content',
  '/audit': 'Content Scan',
  '/settings': 'Settings',
};

export function Header() {
  const pathname = usePathname();
  const pageTitle = routeLabels[pathname] || 'Page';
  const { theme, toggleTheme } = useTheme();
  const { state } = useSidebar();

  return (
    <header
      className={cn(
        'flex h-16 shrink-0 translate-y-0 items-center gap-3 overflow-hidden border-b border-border bg-card/95 px-4 opacity-100 shadow-sm backdrop-blur-sm transition-[height,opacity,transform,box-shadow,border-color] duration-300 ease-out',
        state === 'expanded'
          ? 'lg:h-0 lg:-translate-y-2 lg:border-transparent lg:opacity-0 lg:shadow-none'
          : 'lg:h-16 lg:translate-y-0 lg:border-border lg:opacity-100 lg:shadow-sm'
      )}
    >
      <SidebarTrigger className="-ml-1 text-muted-foreground hover:text-foreground" />
      <Separator orientation="vertical" className="mr-1 h-5" />
      <Breadcrumb className="flex-1">
        <BreadcrumbList>
          <BreadcrumbItem className="hidden md:block">
            <BreadcrumbLink href="/" className="text-muted-foreground">
              Editorial Platform
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator className="hidden md:block" />
          <BreadcrumbItem>
            <BreadcrumbPage className="font-medium text-foreground">
              {pageTitle}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="hidden items-center gap-2 rounded-md border border-border bg-secondary px-3 py-1.5 text-xs text-muted-foreground md:flex">
        <span className="h-2 w-2 rounded-full bg-success" />
        Platform workspace
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleTheme}
        aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
        className="ml-auto h-8 w-8 text-muted-foreground hover:text-foreground"
      >
        {theme === 'light' ? (
          <Moon className="h-4 w-4" />
        ) : (
          <Sun className="h-4 w-4" />
        )}
      </Button>
    </header>
  );
}
