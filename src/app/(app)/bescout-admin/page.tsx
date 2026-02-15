import type { Metadata } from 'next';
import BescoutAdminContent from './BescoutAdminContent';

export const metadata: Metadata = {
  title: 'BeScout Admin',
  description: 'Plattform-Administration',
};

export default function BescoutAdminPage() {
  return <BescoutAdminContent />;
}
