'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/src/contexts/AuthContext';
import { useSidebar } from '@/src/contexts/SidebarContext';
import { cn } from '@/src/lib/utils';
import {
  LayoutDashboard,
  User,
  Users,
  LogOut,
  HardDrive,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const navItems = [
  { name: 'Início', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Família', href: '/dashboard/family', icon: Users },
  { name: 'Perfil', href: '/dashboard/profile', icon: User },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const router = useRouter();
  const { isExpanded, toggle, isMobileOpen, closeMobile } = useSidebar();

  // Close mobile sidebar on navigation
  useEffect(() => {
    closeMobile();
  }, [pathname, closeMobile]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const initials = user?.name
    ? user.name.trim().split(/\s+/).map((s) => s[0]).slice(0, 2).join('').toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? 'U';

  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={closeMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'flex h-full flex-col border-r border-border bg-card shrink-0 overflow-hidden',
          'transition-[width,transform] duration-200 ease-in-out',
          // Desktop: relative, no translate
          'md:relative md:inset-auto md:z-auto md:translate-x-0',
          // Mobile: fixed, slides in/out
          'fixed inset-y-0 left-0 z-50',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
          isExpanded ? 'w-60' : 'md:w-16 w-60'
        )}
      >
        {/* Logo + expand/collapse */}
        <div
          className={cn(
            'flex shrink-0 border-b border-border',
            isExpanded
              ? 'h-14 sm:h-16 flex-row items-center justify-between gap-2 px-4'
              : 'md:flex-col md:items-center md:justify-center md:gap-3 md:py-5 md:min-h-[4.5rem] h-14 sm:h-16 flex-row items-center justify-between gap-2 px-4'
          )}
        >
          <Link
            href="/dashboard"
            className={cn(
              'flex items-center min-w-0 overflow-hidden',
              isExpanded ? 'shrink' : 'md:shrink-0 md:justify-center shrink'
            )}
          >
            <HardDrive className="h-7 w-7 shrink-0 text-primary" />
            <span
              className={cn(
                'font-semibold text-lg text-foreground truncate whitespace-nowrap transition-all duration-200 overflow-hidden',
                isExpanded
                  ? 'ml-3 opacity-100 max-w-[120px]'
                  : 'md:ml-0 md:max-w-0 md:opacity-0 ml-3 opacity-100 max-w-[120px]'
              )}
            >
              Driver
            </span>
          </Link>
          <button
            type="button"
            onClick={toggle}
            className="hidden md:block shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            aria-label={isExpanded ? 'Recolher menu' : 'Expandir menu'}
          >
            {isExpanded ? (
              <PanelLeftClose className="h-5 w-5" />
            ) : (
              <PanelLeftOpen className="h-5 w-5" />
            )}
          </button>
        </div>

        {/* Nav */}
        <nav className={cn(
          'flex-1 space-y-0.5',
          isExpanded ? 'py-4' : 'md:pt-6 md:pb-4 py-4'
        )}>
          {navItems.map((item) => {
            const isActive =
              item.href === '/dashboard/family'
                ? pathname.startsWith('/dashboard/family')
                : pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                title={!isExpanded ? item.name : undefined}
                className={cn(
                  'flex items-center gap-3 rounded-lg py-2.5 text-sm font-medium transition-colors',
                  isExpanded ? 'mx-2 px-3' : 'md:justify-center md:px-2 md:mx-1 mx-2 px-3',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground'
                )}
              >
                <item.icon className={cn('h-5 w-5 shrink-0', isActive && 'text-primary')} />
                <span
                  className={cn(
                    'truncate whitespace-nowrap transition-all duration-200',
                    isExpanded ? 'opacity-100 w-auto' : 'md:w-0 md:overflow-hidden md:opacity-0 opacity-100 w-auto'
                  )}
                >
                  {item.name}
                </span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={handleLogout}
            title={!isExpanded ? 'Sair' : undefined}
            className={cn(
              'flex w-full items-center gap-3 rounded-lg py-2.5 text-sm font-medium transition-colors',
              'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground',
              isExpanded ? 'mx-2 px-3' : 'md:justify-center md:px-2 md:mx-1 mx-2 px-3'
            )}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            <span
              className={cn(
                'truncate whitespace-nowrap transition-all duration-200',
                isExpanded ? 'opacity-100 w-auto' : 'md:w-0 md:overflow-hidden md:opacity-0 opacity-100 w-auto'
              )}
            >
              Sair
            </span>
          </button>
        </nav>

        {/* User block */}
        <div className={cn(
          'border-t border-border shrink-0',
          isExpanded ? 'px-4 pt-4 pb-4' : 'md:p-2 px-4 pt-4 pb-4'
        )}>
          <Link
            href="/dashboard/profile"
            title={!isExpanded ? (user?.name || 'Perfil') : undefined}
            className={cn(
              'flex items-center rounded-md transition-colors hover:bg-accent/50',
              isExpanded ? 'gap-3 p-1 -m-1' : 'md:justify-center md:p-1 gap-3 p-1 -m-1'
            )}
          >
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-none bg-primary text-xs font-medium text-primary-foreground"
              aria-hidden
            >
              {initials}
            </div>
            <div
              className={cn(
                'min-w-0 flex-1 overflow-hidden transition-all duration-200',
                isExpanded ? 'opacity-100' : 'md:w-0 md:opacity-0 opacity-100'
              )}
            >
              <p className="truncate text-sm font-semibold text-foreground whitespace-nowrap">
                {user?.name || 'Usuário'}
              </p>
              <p className="truncate text-[11px] text-muted-foreground whitespace-nowrap">
                {user?.email ?? 'usuario@email.com'}
              </p>
            </div>
          </Link>
        </div>
      </aside>
    </>
  );
}
