import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Scouting Zone' };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
