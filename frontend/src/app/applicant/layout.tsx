import { AppHeader } from '@/components/app-header';

export default function ApplicantLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-surface min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </div>
  );
}
