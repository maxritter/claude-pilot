import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  compact?: boolean;
  onClick?: (e: React.MouseEvent) => void;
}

export function Card({ children, className = '', compact = false, onClick }: CardProps) {
  return (
    <div
      className={`card bg-base-100 shadow-sm border border-base-200 ${compact ? 'card-compact' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

export function CardBody({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`card-body ${className}`}>{children}</div>;
}

export function CardTitle({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <h2 className={`card-title ${className}`}>{children}</h2>;
}

export function CardActions({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`card-actions justify-end ${className}`}>{children}</div>;
}
