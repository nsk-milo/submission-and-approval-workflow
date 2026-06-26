'use client';

import Link from 'next/link';
import { LogOut, Workflow } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';

export function AppHeader() {
  const { user, logout } = useAuth();
  const home = user?.role === 'REVIEWER' ? '/reviewer' : '/applicant';

  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/70 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href={home} className="group flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-sm">
            <Workflow className="h-4 w-4" />
          </span>
          <span className="flex flex-col leading-tight">
            <span className="text-sm font-semibold tracking-tight">Submission Approval</span>
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Workflows
            </span>
          </span>
        </Link>

        <div className="flex items-center gap-4">
          {user && (
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium leading-tight">{user.name ?? user.email}</p>
              <p className="text-xs capitalize text-muted-foreground">{user.role.toLowerCase()}</p>
            </div>
          )}
          <ThemeToggle />
          <Button variant="outline" size="sm" onClick={logout}>
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sign out</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
