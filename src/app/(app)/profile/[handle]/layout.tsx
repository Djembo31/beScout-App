import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

type Props = { params: Promise<{ handle: string }>; children: React.ReactNode };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await getTranslations('meta');
  try {
    const { handle } = await params;
    const { data } = await supabaseAdmin
      .from('profiles')
      .select('display_name, handle, avatar_url, top_role')
      .eq('handle', handle.toLowerCase())
      .maybeSingle();
    if (data) {
      const name = data.display_name || `@${data.handle}`;
      const desc = `${name} auf BeScout${data.top_role ? ` — ${data.top_role}` : ''}`;
      return {
        title: name,
        description: desc,
        openGraph: {
          title: `${name} | BeScout`,
          description: desc,
          ...(data.avatar_url && data.avatar_url.trim() ? { images: [data.avatar_url] } : {}),
        },
        twitter: {
          card: 'summary',
          title: `${name} | BeScout`,
          description: desc,
        },
      };
    }
  } catch (err) { console.error('[Profile] generateMetadata failed:', err); }
  return { title: t('profile') };
}

export default function ProfileHandleLayout({ children }: Props) {
  return children;
}
