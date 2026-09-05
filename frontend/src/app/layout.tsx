import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MSEX — Mini Stock Exchange Engine',
  description: 'Live order book, trades, and order submission for the mini matching engine.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full bg-gray-900">
      <body className="h-full antialiased">{children}</body>
    </html>
  );
}
