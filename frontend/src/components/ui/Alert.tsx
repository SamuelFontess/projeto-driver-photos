import React from 'react';

type AlertVariant = 'error' | 'success' | 'info';

interface AlertProps {
  variant?: AlertVariant;
  children: React.ReactNode;
}

export function Alert({ variant = 'info', children }: AlertProps) {
  return <div className={`ui-alert ui-alert--${variant}`}>{children}</div>;
}
