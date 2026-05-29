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
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
        <Link href="/" prefetch={false} className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-sidebar-primary shadow-sm">
            <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
          <div className="flex min-w-0 flex-col">
            <span className="text-[13px] font-semibold tracking-[0.08em] text-sidebar-foreground">
              EDITOR[AI]L
            </span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-2 py-2.5">
        <SidebarGroup className="p-1.5">
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href}
                    className={cn(
                      'h-8 rounded-md px-2 text-[13px] text-sidebar-foreground/78 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground [&>svg]:h-3.5 [&>svg]:w-3.5',
                      pathname === item.href &&
                        'bg-sidebar-accent text-sidebar-accent-foreground shadow-sm'
                    )}
                  >
                    <Link href={item.href} prefetch={false}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="p-1.5 pt-2">
          <SidebarGroupLabel className="h-6 px-2 text-[11px] text-sidebar-foreground/50">
            Quick Create
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0">
              {contentTypeItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    className="h-6 rounded-md px-2 text-xs text-sidebar-foreground/72 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground [&>svg]:h-3 [&>svg]:w-3"
                  >
                    <Link href={item.href} prefetch={false}>
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

      <SidebarFooter className="border-t border-sidebar-border p-3">
        <SidebarMenu className="gap-0.5">
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={pathname === '/settings'}
              className={cn(
                'h-8 rounded-md px-2 text-[13px] text-sidebar-foreground/78 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground [&>svg]:h-3.5 [&>svg]:w-3.5',
                pathname === '/settings' &&
                  'bg-sidebar-accent text-sidebar-accent-foreground'
              )}
            >
              <Link href="/settings" prefetch={false}>
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <div className="px-2 pt-1 font-mono text-[9px] leading-none text-sidebar-foreground/45">
          SHA {gitSha}
        </div>
      </SidebarFooter>
      
      <SidebarRail />
    </Sidebar>
  );
}
