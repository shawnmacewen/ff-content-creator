'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Sparkles,
  FolderOpen,
  Library,
  Settings,
  FileText,
  Mail,
  Share2,
  SearchCheck,
  PenSquare,
  CircleDot,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

const mainNavItems = [
  {
    title: 'Dashboard',
    href: '/',
    icon: LayoutDashboard,
  },
  {
    title: 'Generate Content',
    href: '/generate',
    icon: Sparkles,
  },
  {
    title: 'EchoWrite',
    href: '/echo-write',
    icon: PenSquare,
  },
  {
    title: 'Source Content',
    href: '/source-content',
    icon: FolderOpen,
  },
  {
    title: 'Saved Content',
    href: '/library',
    icon: Library,
  },
  {
    title: 'Content Scan',
    href: '/audit',
    icon: SearchCheck,
  },
];

const contentTypeItems = [
  {
    title: 'Social Media',
    href: '/generate?type=social',
    icon: Share2,
  },
  {
    title: 'Email & Newsletter',
    href: '/generate?type=email',
    icon: Mail,
  },
  {
    title: 'Articles',
    href: '/generate?type=article',
    icon: FileText,
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const gitSha = process.env.NEXT_PUBLIC_GIT_SHA || 'unknown';

  return (
    <Sidebar className="border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border px-5 py-5">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-sidebar-primary shadow-sm">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="flex min-w-0 flex-col">
            <span className="text-sm font-semibold tracking-[0.08em] text-sidebar-foreground">
              EDITOR[AI]L
            </span>
            <span className="text-xs text-sidebar-foreground/60">
              Internal content curation
            </span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-2 py-3">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href}
                    className={cn(
                      'h-9 rounded-md text-sidebar-foreground/78 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                      pathname === item.href &&
                        'bg-sidebar-accent text-sidebar-accent-foreground shadow-sm'
                    )}
                  >
                    <Link href={item.href}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50">
            Quick Create
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {contentTypeItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    className="h-9 rounded-md text-sidebar-foreground/72 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  >
                    <Link href={item.href}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <div className="rounded-md border border-sidebar-border bg-sidebar-accent/40 p-3 text-xs text-sidebar-foreground/72">
          <div className="mb-1 flex items-center gap-2 font-medium text-sidebar-foreground">
            <CircleDot className="h-3.5 w-3.5 text-sidebar-primary" />
            Workflow status
          </div>
          <p className="leading-relaxed">
            Content sync, generation, and review tools are online.
          </p>
        </div>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={pathname === '/settings'}
              className={cn(
                'h-9 rounded-md text-sidebar-foreground/78 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                pathname === '/settings' &&
                  'bg-sidebar-accent text-sidebar-accent-foreground'
              )}
            >
              <Link href="/settings">
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <div className="px-2 pt-1 font-mono text-[10px] leading-none text-sidebar-foreground/45">
          SHA {gitSha}
        </div>
      </SidebarFooter>
      
      <SidebarRail />
    </Sidebar>
  );
}
