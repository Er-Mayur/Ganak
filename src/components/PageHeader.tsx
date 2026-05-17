import React from 'react';

interface PageHeaderProps {
  title: string;
  subtitle: string;
}

export const PageHeader = ({ title, subtitle }: PageHeaderProps) => {
  return (
    <div className="text-center">
      <h1 className="om-symbol text-4xl mb-2">गणक</h1>
      <h2 className="text-2xl font-bold text-foreground mb-1">{title}</h2>
      <p className="text-muted-foreground">{subtitle}</p>
    </div>
  );
};
