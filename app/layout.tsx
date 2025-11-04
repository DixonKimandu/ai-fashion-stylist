import type { ReactNode } from 'react';
import './globals.css';

export const metadata = {
  title: 'AI Fashion Stylist',
  description: 'Style outfits and design sustainable tote bags with AI',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

