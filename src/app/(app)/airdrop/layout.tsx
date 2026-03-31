import { getTranslations } from 'next-intl/server';

export async function generateMetadata() {
  const t = await getTranslations('meta');
  return { title: t('airdrop') };
}

export default function AirdropLayout({ children }: { children: React.ReactNode }) {
  return children;
}
