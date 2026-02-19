'use client';

import Image from 'next/image';
import Link from 'next/link';
import { TrendingUp, Trophy, Users, Vote, ChevronDown, Wallet, ShoppingCart, BarChart3 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui';

export default function WelcomePage() {
  const t = useTranslations('welcome');

  const features = [
    {
      icon: TrendingUp,
      color: 'text-[#FFD700]',
      bg: 'bg-[#FFD700]/10',
      title: t('featureDpcTitle'),
      text: t('featureDpcText'),
    },
    {
      icon: Trophy,
      color: 'text-purple-400',
      bg: 'bg-purple-400/10',
      title: t('featureFantasyTitle'),
      text: t('featureFantasyText'),
    },
    {
      icon: Users,
      color: 'text-sky-400',
      bg: 'bg-sky-400/10',
      title: t('featureCommunityTitle'),
      text: t('featureCommunityText'),
    },
    {
      icon: Vote,
      color: 'text-[#22C55E]',
      bg: 'bg-[#22C55E]/10',
      title: t('featureVotesTitle'),
      text: t('featureVotesText'),
    },
  ];

  const steps = [
    {
      icon: Wallet,
      num: '01',
      title: t('step1Title'),
      text: t('step1Text'),
    },
    {
      icon: ShoppingCart,
      num: '02',
      title: t('step2Title'),
      text: t('step2Text'),
    },
    {
      icon: BarChart3,
      num: '03',
      title: t('step3Title'),
      text: t('step3Text'),
    },
  ];

  const stats = [
    { value: '25', label: t('statsPlayers') },
    { value: '1', label: t('statsPartner') },
    { value: 'TFF', label: t('statsLeague') },
    { value: 'Beta', label: t('statsPhase') },
  ];

  return (
    <div className="relative min-h-screen bg-[#0a0a0a] text-white overflow-x-hidden">
      {/* ── Background Effects ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-1/4 w-[640px] h-[640px] bg-[#FFD700]/[0.03] rounded-full blur-[140px]" />
        <div className="absolute bottom-0 left-1/4 w-[820px] h-[820px] bg-[#22C55E]/[0.035] rounded-full blur-[160px]" />
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          }}
        />
      </div>

      {/* ── 1. Hero ── */}
      <section className="relative flex flex-col items-center justify-center min-h-screen px-4 text-center">
        <div className="flex items-center gap-3 mb-6">
          <Image src="/logo.png" alt="BeScout Logo" width={48} height={48} className="w-10 h-10 md:w-12 md:h-12" />
          <Image src="/schrift.png" alt="BeScout" width={160} height={40} className="h-8 md:h-10 w-auto" />
        </div>

        <h1 className="text-3xl md:text-5xl lg:text-6xl font-black leading-tight max-w-3xl">
          {t('heroTitle')}{' '}
          <span className="text-[#FFD700]">{t('heroHighlight')}</span>.
        </h1>

        <p className="mt-4 md:mt-6 text-base md:text-lg text-white/60 max-w-xl leading-relaxed">
          {t('heroSubtitle')}
        </p>

        <Link href="/login" className="mt-8">
          <Button variant="gold" size="lg" className="text-base md:text-lg px-8 py-3.5">
            {t('ctaStart')}
          </Button>
        </Link>

        <button
          onClick={() => document.getElementById('social-proof')?.scrollIntoView({ behavior: 'smooth' })}
          className="absolute bottom-10 flex flex-col items-center gap-1 text-white/30 hover:text-white/50 transition-colors"
        >
          <span className="text-xs">{t('learnMore')}</span>
          <ChevronDown className="w-5 h-5 animate-bounce" />
        </button>
      </section>

      {/* ── 2. Social Proof Bar ── */}
      <section id="social-proof" className="relative border-y border-white/[0.06] bg-white/[0.01]">
        <div className="max-w-6xl mx-auto px-4 py-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          {stats.map((s) => (
            <div key={s.label}>
              <div className="text-xl md:text-2xl font-black font-mono text-[#FFD700]">{s.value}</div>
              <div className="text-xs text-white/50 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 3. Features ── */}
      <section className="relative max-w-6xl mx-auto px-4 py-20 md:py-28">
        <h2 className="text-2xl md:text-4xl lg:text-5xl font-black text-center mb-12 md:mb-16">
          {t('featuresTitle')}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {features.map((f) => (
            <div
              key={f.title}
              className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 md:p-8 hover:border-white/20 transition-colors"
            >
              <div className={`w-12 h-12 rounded-xl ${f.bg} flex items-center justify-center mb-4`}>
                <f.icon className={`w-6 h-6 ${f.color}`} />
              </div>
              <h3 className="text-lg font-black mb-2">{f.title}</h3>
              <p className="text-sm text-white/50 leading-relaxed">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 4. How It Works ── */}
      <section className="relative border-y border-white/[0.06] bg-white/[0.01]">
        <div className="max-w-6xl mx-auto px-4 py-20 md:py-28">
          <h2 className="text-2xl md:text-4xl lg:text-5xl font-black text-center mb-12 md:mb-16">
            {t('howItWorksTitle')}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {steps.map((s) => (
              <div key={s.num} className="text-center md:text-left">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#FFD700]/10 mb-4">
                  <s.icon className="w-7 h-7 text-[#FFD700]" />
                </div>
                <div className="text-xs font-mono text-[#FFD700]/60 mb-1">{t('step')} {s.num}</div>
                <h3 className="text-lg font-black mb-2">{s.title}</h3>
                <p className="text-sm text-white/50 leading-relaxed">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 5. Vision Quote ── */}
      <section className="relative max-w-4xl mx-auto px-4 py-20 md:py-28 text-center">
        <blockquote className="text-xl md:text-2xl lg:text-3xl font-black leading-snug text-white/90">
          &ldquo;{t('visionQuote')}&rdquo;
        </blockquote>
        <p className="mt-6 text-sm md:text-base text-white/40 max-w-lg mx-auto leading-relaxed">
          {t('visionSub')}
        </p>
      </section>

      {/* ── 6. Pilot Partner ── */}
      <section className="relative border-y border-white/[0.06] bg-white/[0.01]">
        <div className="max-w-6xl mx-auto px-4 py-20 md:py-28">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 items-center">
            <div className="relative rounded-2xl overflow-hidden aspect-video">
              <Image
                src="/Sakarya_Stadion.jpg"
                alt="Yeni Sakarya Stadyumu"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent" />
            </div>
            <div className="text-center lg:text-left">
              <div className="flex items-center justify-center lg:justify-start gap-3 mb-4">
                <Image src="/Sakarya_logo.png" alt="Sakaryaspor" width={48} height={48} className="w-12 h-12" />
                <span className="text-lg font-black">{t('pilotPartner')}</span>
              </div>
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-black mb-4">
                {t('pilotTitle')}
              </h2>
              <p className="text-sm md:text-base text-white/50 leading-relaxed">
                {t('pilotDesc')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 7. Final CTA ── */}
      <section className="relative max-w-4xl mx-auto px-4 py-20 md:py-28 text-center">
        <h2 className="text-2xl md:text-4xl lg:text-5xl font-black mb-6">
          {t('finalCtaTitle')}
        </h2>
        <p className="text-sm md:text-base text-white/50 mb-8 max-w-md mx-auto">
          {t('finalCtaDesc')}
        </p>
        <Link href="/login">
          <Button variant="gold" size="lg" className="text-base md:text-lg px-8 py-3.5">
            {t('finalCtaButton')}
          </Button>
        </Link>
      </section>

      {/* ── 8. Footer ── */}
      <footer className="relative border-t border-white/[0.06] bg-white/[0.01]">
        <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="BeScout" width={24} height={24} className="w-6 h-6" />
            <span className="text-xs text-white/40">&copy; 2026 BeScout</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-white/30">
            <span className="hover:text-white/50 cursor-pointer transition-colors">{t('footerTerms')}</span>
            <span className="hover:text-white/50 cursor-pointer transition-colors">{t('footerPrivacy')}</span>
            <span className="hover:text-white/50 cursor-pointer transition-colors">{t('footerImprint')}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
