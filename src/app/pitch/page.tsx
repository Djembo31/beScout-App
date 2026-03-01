'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import {
  TrendingUp,
  Trophy,
  Users,
  BarChart3,
  Check,
  X,
  AlertTriangle,
  Star,
  ArrowRight,
  Mail,
  Monitor,
  Globe,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────
type PackageTier = 'baslangic' | 'profesyonel' | 'sampiyon';

// ─── Hero Section ───────────────────────────────────
function HeroSection() {
  const t = useTranslations('pitch');
  return (
    <section className="relative text-center py-16 md:py-24 px-4">
      <div className="max-w-3xl mx-auto">
        <Image src="/logo.svg" alt="BeScout" width={80} height={80} className="mx-auto mb-4" priority />
        <h1 className="text-3xl md:text-5xl font-black mb-3 text-balance text-gold">
          {t('heroTitle')}
        </h1>
        <p className="text-lg md:text-xl text-white/70 mb-8 max-w-2xl mx-auto text-pretty">
          {t('heroSubtitle')}
        </p>
        <div className="flex flex-wrap justify-center gap-3 text-sm">
          {['566 Oyuncu', '20 Kulüp', 'TFF 1. Lig', 'Beta'].map((stat) => (
            <span key={stat} className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/60 font-mono">
              {stat}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Features Section ───────────────────────────────
function FeaturesSection() {
  const t = useTranslations('pitch');
  const features = [
    { icon: TrendingUp, key: 'dpc' },
    { icon: Trophy, key: 'fantasy' },
    { icon: Users, key: 'community' },
    { icon: BarChart3, key: 'analytics' },
  ] as const;

  return (
    <section className="py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-black text-center text-balance mb-10">{t('featuresTitle')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map(({ icon: Icon, key }) => (
            <div key={key} className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-gold/20 transition-colors">
              <div className="size-10 rounded-xl bg-gold/10 flex items-center justify-center mb-3">
                <Icon className="size-5 text-gold" />
              </div>
              <h3 className="font-bold text-sm text-balance mb-1.5">{t(`feature_${key}_title`)}</h3>
              <p className="text-xs text-white/50 text-pretty leading-relaxed">{t(`feature_${key}_desc`)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Package Comparison Section ─────────────────────
function PackageSection() {
  const t = useTranslations('pitch');

  const packages: { tier: PackageTier; price: string; yearly: string; recommended?: boolean }[] = [
    { tier: 'baslangic', price: '€750', yearly: '€11.500' },
    { tier: 'profesyonel', price: '€1.500', yearly: '€23.000', recommended: true },
    { tier: 'sampiyon', price: '€3.000', yearly: '€46.000' },
  ];

  const rows = [
    { key: 'players', vals: ['30', '50', t('pkg_unlimited')] },
    { key: 'adSpaces', vals: ['2', '5', '10+'] },
    { key: 'scoutPool', vals: ['100K', '500K', '2M'] },
    { key: 'freeFantasy', vals: [true, true, true] },
    { key: 'clubTournaments', vals: [false, true, true] },
    { key: 'scoutReports', vals: [false, true, true] },
    { key: 'eventTools', vals: [false, true, true] },
    { key: 'regionDashboard', vals: [false, true, true] },
    { key: 'fanCouncil', vals: [false, false, true] },
    { key: 'whiteLabel', vals: [false, false, true] },
    { key: 'apiAccess', vals: [false, false, true] },
    { key: 'accountManager', vals: [false, false, true] },
  ];

  return (
    <section className="py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-black text-center text-balance mb-10">{t('packagesTitle')}</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left p-3 text-white/40 font-medium">{t('pkg_feature')}</th>
                {packages.map(({ tier, price, yearly, recommended }) => (
                  <th key={tier} className={cn('p-3 text-center min-w-[140px]', recommended && 'bg-gold/5 rounded-t-xl')}>
                    <div className="font-black text-base">{t(`pkg_${tier}`)}</div>
                    <div className="text-gold font-mono font-bold tabular-nums">{price}<span className="text-white/40 font-normal text-xs">/ay</span></div>
                    <div className="text-white/30 text-xs mt-0.5 tabular-nums">{yearly}/yıl</div>
                    {recommended && (
                      <span className="inline-block mt-1.5 px-2 py-0.5 rounded-full bg-gold text-black text-[10px] font-bold">
                        {t('pkg_recommended')}
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ key, vals }) => (
                <tr key={key} className="border-t border-white/[0.06]">
                  <td className="p-3 text-white/60">{t(`pkg_row_${key}`)}</td>
                  {vals.map((val, i) => (
                    <td key={i} className={cn('p-3 text-center', i === 1 && 'bg-gold/5')}>
                      {typeof val === 'boolean' ? (
                        val ? <Check className="size-4 text-emerald-400 mx-auto" /> : <X className="size-4 text-white/20 mx-auto" />
                      ) : (
                        <span className="font-mono font-semibold tabular-nums">{val}</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

// ─── Sponsoring Calculator Section ──────────────────
function CalculatorSection() {
  const t = useTranslations('pitch');
  const [adSpaces, setAdSpaces] = useState(5);
  const [pricePerSpace, setPricePerSpace] = useState(400);

  const packageCosts: Record<PackageTier, number> = { baslangic: 750, profesyonel: 1500, sampiyon: 3000 };

  const sponsorRevenue = adSpaces * pricePerSpace;

  const results = useMemo(() => {
    return (['baslangic', 'profesyonel', 'sampiyon'] as PackageTier[]).map((tier) => ({
      tier,
      cost: packageCosts[tier],
      net: sponsorRevenue - packageCosts[tier],
    }));
  }, [sponsorRevenue]);

  return (
    <section className="py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-black text-center text-balance mb-2">{t('calcTitle')}</h2>
        <p className="text-center text-white/50 text-sm text-pretty mb-8">{t('calcSubtitle')}</p>

        <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 space-y-6">
          {/* Slider: Ad Spaces */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-white/60">{t('calcAdSpaces')}</span>
              <span className="font-mono font-bold tabular-nums text-gold">{adSpaces}</span>
            </div>
            <input
              type="range"
              min={2}
              max={12}
              value={adSpaces}
              onChange={(e) => setAdSpaces(Number(e.target.value))}
              className="w-full accent-gold h-2 rounded-full bg-white/10"
            />
          </div>

          {/* Slider: Price per Space */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-white/60">{t('calcPricePerSpace')}</span>
              <span className="font-mono font-bold tabular-nums text-gold">{`€${pricePerSpace}`}</span>
            </div>
            <input
              type="range"
              min={200}
              max={1000}
              step={50}
              value={pricePerSpace}
              onChange={(e) => setPricePerSpace(Number(e.target.value))}
              className="w-full accent-gold h-2 rounded-full bg-white/10"
            />
          </div>

          {/* Revenue Display */}
          <div className="pt-4 border-t border-white/10">
            <div className="flex justify-between items-center mb-4">
              <span className="text-white/60 text-sm">{t('calcSponsorRevenue')}</span>
              <span className="text-xl font-mono font-black tabular-nums text-gold">{`€${sponsorRevenue.toLocaleString('de-DE')}`}/ay</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {results.map(({ tier, cost, net }) => (
                <div key={tier} className={cn('p-3 rounded-xl border text-center', net >= 0 ? 'border-emerald-500/20 bg-emerald-950/20' : 'border-red-500/20 bg-red-950/20')}>
                  <div className="text-xs text-white/40 mb-1">{t(`pkg_${tier}`)}</div>
                  <div className="text-xs text-white/50 mb-1">{t('calcCost')}: €{cost}/ay</div>
                  <div className={cn('font-mono font-bold tabular-nums text-lg', net >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                    {net >= 0 ? '+' : ''}{`€${net.toLocaleString('de-DE')}`}
                  </div>
                  <div className="text-[10px] text-white/30 mt-0.5">{t('calcNetPerMonth')}</div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-center text-xs text-gold/60 font-semibold pt-2">
            {t('calcPunchline')}
          </p>
        </div>
      </div>
    </section>
  );
}

// ─── Region Matrix Section ──────────────────────────
function RegionSection() {
  const t = useTranslations('pitch');

  type CellValue = 'yes' | 'no' | 'limited';
  const features: { key: string; vals: CellValue[] }[] = [
    { key: 'dpcTrading', vals: ['limited', 'yes', 'yes', 'yes'] },
    { key: 'freeFantasy', vals: ['yes', 'yes', 'yes', 'yes'] },
    { key: 'prizeLeague', vals: ['no', 'no', 'yes', 'yes'] },
    { key: 'scoutReports', vals: ['yes', 'yes', 'yes', 'yes'] },
    { key: 'communityFeed', vals: ['yes', 'yes', 'yes', 'yes'] },
  ];

  const regions = ['turkey', 'strictEu', 'restEu', 'global'] as const;

  const cellIcon = (val: CellValue) => {
    if (val === 'yes') return <Check className="size-4 text-emerald-400 mx-auto" />;
    if (val === 'no') return <X className="size-4 text-red-400 mx-auto" />;
    return <AlertTriangle className="size-3.5 text-amber-400 mx-auto" />;
  };

  return (
    <section className="py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-black text-center text-balance mb-2">{t('regionTitle')}</h2>
        <p className="text-center text-white/50 text-sm text-pretty mb-8">{t('regionSubtitle')}</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left p-3 text-white/40 font-medium">{t('pkg_feature')}</th>
                {regions.map((r) => (
                  <th key={r} className="p-3 text-center text-white/60 font-medium min-w-[100px]">
                    {t(`region_${r}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {features.map(({ key, vals }) => (
                <tr key={key} className="border-t border-white/[0.06]">
                  <td className="p-3 text-white/60">{t(`region_feat_${key}`)}</td>
                  {vals.map((val, i) => (
                    <td key={i} className="p-3 text-center">{cellIcon(val)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

// ─── Founding Partner Section ───────────────────────
function FoundingPartnerSection() {
  const t = useTranslations('pitch');

  const perks = [
    { key: 'noSetup', icon: Star },
    { key: 'freeMonth', icon: Star },
    { key: 'bonusScout', icon: Star },
    { key: 'badge', icon: Star },
    { key: 'featureVote', icon: Star },
  ] as const;

  return (
    <section className="py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="p-6 md:p-8 rounded-2xl bg-gold/5 border border-gold/20">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-black text-balance">{t('foundingTitle')}</h2>
            <span className="px-3 py-1 rounded-full bg-gold text-black text-xs font-bold">
              {t('foundingBadge')}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            {perks.map(({ key }) => (
              <div key={key} className="flex items-start gap-2">
                <Check className="size-4 text-gold mt-0.5 flex-shrink-0" />
                <span className="text-sm text-white/70">{t(`founding_${key}`)}</span>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-xl bg-black/30 border border-white/[0.06]">
            <h3 className="font-bold text-sm text-balance mb-3 text-white/80">{t('foundingRequirementsTitle')}</h3>
            <ul className="space-y-1.5 text-xs text-white/50">
              <li className="flex items-start gap-2"><ArrowRight className="size-3 mt-0.5 flex-shrink-0 text-white/30" />{t('foundingReq1')}</li>
              <li className="flex items-start gap-2"><ArrowRight className="size-3 mt-0.5 flex-shrink-0 text-white/30" />{t('foundingReq2')}</li>
              <li className="flex items-start gap-2"><ArrowRight className="size-3 mt-0.5 flex-shrink-0 text-white/30" />{t('foundingReq3')}</li>
              <li className="flex items-start gap-2"><ArrowRight className="size-3 mt-0.5 flex-shrink-0 text-white/30" />{t('foundingReq4')}</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── CTA Section ────────────────────────────────────
function CTASection() {
  const t = useTranslations('pitch');
  return (
    <section className="py-16 px-4">
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="text-2xl md:text-3xl font-black text-balance mb-4">{t('ctaTitle')}</h2>
        <p className="text-white/50 text-sm text-pretty mb-8">{t('ctaSubtitle')}</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/login?demo=true"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gold text-black font-bold text-sm hover:bg-gold/90 transition-colors min-h-[44px]"
          >
            <Monitor className="size-4" />
            {t('ctaDemo')}
          </Link>
          <Link
            href="/club/sakaryaspor"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-bold text-sm hover:bg-white/10 transition-colors min-h-[44px]"
          >
            <Globe className="size-4" />
            {t('ctaClubPage')}
          </Link>
        </div>
        <div className="mt-8 flex items-center justify-center gap-2 text-white/40 text-sm">
          <Mail className="size-4" />
          <a href="mailto:anil@bescout.app" className="hover:text-white/70 transition-colors">anil@bescout.app</a>
        </div>
      </div>
    </section>
  );
}

// ─── Main Page ──────────────────────────────────────
export default function PitchPage() {
  return (
    <div className="min-h-dvh bg-bg-main text-white print:bg-white print:text-black">
      {/* Print styles */}
      <style>{`
        @media print {
          body { background: white !important; color: black !important; }
          .print\\:bg-white { background: white !important; }
          .print\\:text-black { color: black !important; }
          section { break-inside: avoid; }
          input[type="range"] { display: none; }
        }
      `}</style>

      <HeroSection />
      <FeaturesSection />
      <PackageSection />
      <CalculatorSection />
      <RegionSection />
      <FoundingPartnerSection />
      <CTASection />

      {/* Footer */}
      <footer className="py-6 text-center text-xs text-white/20 border-t border-white/[0.06]">
        BeScout &copy; 2026 &middot; Malta
      </footer>
    </div>
  );
}
