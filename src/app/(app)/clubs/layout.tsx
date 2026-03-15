import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Clubs entdecken',
  description: 'Entdecke Clubs und folge deinen Favoriten.',
};

export default function ClubsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
