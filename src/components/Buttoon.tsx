import clsx from 'clsx';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  children?: ReactNode;
}

export const Buttoon = ({ children, className, ...props }: Props) => (
  <button
    className={clsx('bg-blue-900 p-2 rounded-md text-white', className)}
    {...props}
  >
    {children}
  </button>
);
