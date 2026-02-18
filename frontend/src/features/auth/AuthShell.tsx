import Link from 'next/link';
import { Card } from '@/src/components/ui';
import styles from './auth.module.css';

interface AuthShellProps {
  title: string;
  subtitle: string;
  footerText: string;
  footerLinkHref: string;
  footerLinkText: string;
  children: React.ReactNode;
}

export function AuthShell({
  title,
  subtitle,
  footerText,
  footerLinkHref,
  footerLinkText,
  children,
}: AuthShellProps) {
  return (
    <main className={styles.page}>
      <Card className={styles.card}>
        <div className="stack-lg">
          <header className="stack">
            <h1 className={styles.title}>{title}</h1>
            <p className="text-secondary">{subtitle}</p>
          </header>
          {children}
          <p className={styles.footer}>
            {footerText} <Link href={footerLinkHref}>{footerLinkText}</Link>
          </p>
        </div>
      </Card>
    </main>
  );
}
