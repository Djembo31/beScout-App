import type { Metadata } from 'next';
import AdminContent from './AdminContent';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const name = slug.charAt(0).toUpperCase() + slug.slice(1);
  return { title: `${name} Admin | Club` };
}

export default async function ClubAdminPage({ params }: Props) {
  const { slug } = await params;
  return <AdminContent slug={slug} />;
}
