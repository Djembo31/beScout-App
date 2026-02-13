import type { Metadata } from 'next';
import ClubContent from './ClubContent';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const name = slug.charAt(0).toUpperCase() + slug.slice(1);
  return { title: `${name} | Club` };
}

export default async function ClubSlugPage({ params }: Props) {
  const { slug } = await params;
  return <ClubContent slug={slug} />;
}
