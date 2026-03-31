import { getTranslations } from 'next-intl/server';

export async function generateMetadata() {
  const t = await getTranslations('meta');
  return { title: t('profile') };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
