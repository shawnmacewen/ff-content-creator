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
import { Moon, PanelTop, Sun } from 'lucide-react';
import { useTheme } from '@/components/layout/theme-provider';
import { useTopNavVisibility } from '@/components/layout/top-nav-visibility';
import Link from 'next/link';

const routeLabels: Record<string, string> = {
  '/': 'Dashboard',
  '/generate': 'Generate Content',
  '/echo-write': 'EchoWrite',
  '/source-content': 'Source Content',
  '/library': 'Saved Content',
  '/audit': 'Content Scan',
  '/settings': 'Workspace',
  '/product-lab': 'Product Lab',
  '/content-upload': 'Content Upload',
  '/ce-course-creator': 'CE Course Creator',
  '/canadianizer': 'Canadianizer',
};

export function Header() {
  const pathname = usePathname();
  const pageTitle = routeLabels[pathname] || 'Page';
  const { theme, toggleTheme } = useTheme();
  const { isTopNavVisible, setTopNavVisible } = useTopNavVisibility();

  if (!isTopNavVisible) return null;

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
      <Button
        asChild
        variant="link"
        size="sm"
        className="hidden h-8 px-2 text-xs font-medium text-muted-foreground hover:text-foreground md:inline-flex"
      >
        <Link href="/settings?tab=custom-profile" prefetch={false}>
          <span className="h-2 w-2 rounded-full bg-success" />
          Custom Profile
        </Link>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={toggleTheme}
        aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
        className="h-8 px-2 text-muted-foreground hover:text-foreground"
      >
        {theme === 'light' ? (
          <Moon className="h-4 w-4" />
        ) : (
          <Sun className="h-4 w-4" />
        )}
        <span className="hidden text-xs sm:inline">{theme === 'light' ? 'Dark' : 'Light'}</span>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setTopNavVisible(false)}
        aria-label="Hide top navigation"
        title="Hide top navigation"
        className="h-8 w-8 text-muted-foreground hover:text-foreground"
      >
        <PanelTop className="h-4 w-4" />
      </Button>
    </header>
  );
}
