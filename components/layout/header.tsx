'use client';

import { SidebarTrigger } from '@/components/ui/sidebar';
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

const routeLabels: Record<string, string> = {
  '/': 'Dashboard',
  '/generate': 'Generate Content',
  '/echo-write': 'EchoWrite',
  '/source-content': 'Source Content',
  '/library': 'Content Library',
  '/audit': 'Content Scan',
  '/settings': 'Settings',
};

export function Header() {
  const pathname = usePathname();
  const pageTitle = routeLabels[pathname] || 'Page';
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b border-border bg-card/95 px-4 shadow-sm backdrop-blur-sm">
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
