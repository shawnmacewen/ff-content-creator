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
    title: 'Content Library',
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
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border px-6 py-4">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-sidebar-foreground">
              EDITOR[AI]L
            </span>
            <span className="text-xs text-muted-foreground">Content Hub</span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href}
                    className={cn(
                      'transition-colors',
                      pathname === item.href && 'bg-sidebar-accent text-sidebar-accent-foreground'
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
          <SidebarGroupLabel>Quick Create</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {contentTypeItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    className="transition-colors"
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
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/settings">
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <div className="px-2 pt-2 font-mono text-[10px] leading-none text-muted-foreground">
          SHA {gitSha}
        </div>
      </SidebarFooter>
      
      <SidebarRail />
    </Sidebar>
  );
}
