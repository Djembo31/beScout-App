'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface LegalLayoutProps {
  children: React.ReactNode;
  title: string;
}

export function LegalLayout({ children, title }: LegalLayoutProps) {
  const t = useTranslations('legal');

  return (
    <div className="min-h-screen bg-bg-main text-white">
      {/* Header */}
      <header className="border-b border-white/[0.06]">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 text-white/50 hover:text-white/80 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">{t('backToHome')}</span>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <Image src="/logo.svg" alt="BeScout" width={24} height={24} className="w-6 h-6" />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-10 md:py-16">
        <h1 className="text-2xl md:text-3xl font-black mb-8">{title}</h1>
        <div className="prose-legal space-y-8 text-white/70 text-sm leading-relaxed">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.06]">
        <div className="max-w-4xl mx-auto px-4 py-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="text-xs text-white/30">{t('copyright')}</span>
          <div className="flex items-center gap-6 text-xs text-white/30">
            <Link href="/agb" className="hover:text-white/50 transition-colors">AGB</Link>
            <Link href="/datenschutz" className="hover:text-white/50 transition-colors">Datenschutz</Link>
            <Link href="/impressum" className="hover:text-white/50 transition-colors">Impressum</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
