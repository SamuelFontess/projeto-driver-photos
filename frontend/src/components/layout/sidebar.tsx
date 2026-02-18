'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/src/contexts/AuthContext';
import { useSidebar } from '@/src/contexts/SidebarContext';
import { cn } from '@/src/lib/utils';
import {
  LayoutDashboard,
  User,
  LogOut,
  HardDrive,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

const navItems = [
  { name: 'Início', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Perfil', href: '/dashboard/profile', icon: User },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const router = useRouter();
  const { isExpanded, toggle } = useSidebar();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const initials = user?.name
    ? user.name.trim().split(/\s+/).map((s) => s[0]).slice(0, 2).join('').toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? 'U';

  return (
    <aside
      className={cn(
        'flex h-full flex-col border-r border-border bg-card shrink-0 overflow-hidden',
        'transition-[width] duration-200 ease-in-out',
        'fixed inset-y-0 left-0 z-50 md:relative md:inset-auto md:z-auto',
        isExpanded ? 'w-60' : 'w-16'
      )}
    >
      {/* Logo + expand/collapse */}
      <div
        className={cn(
          'flex shrink-0 border-b border-border',
          isExpanded
            ? 'h-14 flex-row items-center justify-between gap-2 px-4'
            : 'flex-col items-center justify-center gap-3 py-4 min-h-[4.5rem]'
        )}
      >
        <Link
          href="/dashboard"
          className={cn(
            'flex items-center min-w-0 overflow-hidden',
            isExpanded ? 'shrink' : 'shrink-0 justify-center'
          )}
        >
          <HardDrive className="h-7 w-7 shrink-0 text-primary" />
          <span
            className={cn(
              'font-semibold text-lg text-foreground truncate whitespace-nowrap transition-all duration-200 overflow-hidden',
              isExpanded ? 'ml-3 opacity-100 max-w-[120px]' : 'ml-0 max-w-0 opacity-0'
            )}
          >
            Driver
          </span>
        </Link>
        <button
          type="button"
          onClick={toggle}
          className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
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
        isExpanded ? 'py-4' : 'pt-6 pb-4'
      )}>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              title={!isExpanded ? item.name : undefined}
              className={cn(
                'flex items-center gap-3 rounded-none py-3 text-sm font-medium transition-colors',
                'relative border-l-[3px] border-transparent',
                isExpanded ? 'px-4 pl-4' : 'justify-center px-0',
                isActive
                  ? 'border-primary bg-primary/10 text-foreground'
                  : 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground'
              )}
              style={!isExpanded && isActive ? { paddingLeft: '1.5px' } : undefined}
            >
              <item.icon className={cn('h-5 w-5 shrink-0', isActive && 'text-primary')} />
              <span
                className={cn(
                  'truncate whitespace-nowrap transition-all duration-200',
                  isExpanded ? 'opacity-100 w-auto' : 'w-0 overflow-hidden opacity-0'
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
            'flex w-full items-center gap-3 rounded-none py-3 text-sm font-medium transition-colors',
            'border-l-[3px] border-transparent text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground',
            isExpanded ? 'px-4 pl-4' : 'justify-center px-0'
          )}
        >
          <LogOut className="h-5 w-5 shrink-0" />
          <span
            className={cn(
              'truncate whitespace-nowrap transition-all duration-200',
              isExpanded ? 'opacity-100 w-auto' : 'w-0 overflow-hidden opacity-0'
            )}
          >
            Sair
          </span>
        </button>
      </nav>

      {/* User block */}
      <div className={cn(
        'border-t border-border shrink-0',
        isExpanded ? 'px-4 pt-4 pb-4' : 'p-2'
      )}>
        <Link
          href="/dashboard/profile"
          title={!isExpanded ? (user?.name || 'Perfil') : undefined}
          className={cn(
            'flex items-center rounded-md transition-colors hover:bg-accent/50',
            isExpanded ? 'gap-3 p-1 -m-1' : 'justify-center p-1'
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
              isExpanded ? 'opacity-100' : 'w-0 opacity-0'
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
  );
}
