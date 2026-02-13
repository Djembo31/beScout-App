'use client';

import React from 'react';
import { Settings, Shield } from 'lucide-react';
import { Card } from '@/components/ui';
import type { ClubWithAdmin } from '@/types';

export default function AdminSettingsTab({ club }: { club: ClubWithAdmin }) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-black">Einstellungen</h2>

      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
            <Shield className="w-5 h-5 text-white/50" />
          </div>
          <div>
            <div className="font-bold">Club Info</div>
            <div className="text-xs text-white/50">Grundlegende Informationen</div>
          </div>
        </div>
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between p-3 bg-white/[0.02] rounded-xl">
            <span className="text-white/50">Name</span>
            <span className="font-bold">{club.name}</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-white/[0.02] rounded-xl">
            <span className="text-white/50">Slug</span>
            <span className="font-mono text-white/70">{club.slug}</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-white/[0.02] rounded-xl">
            <span className="text-white/50">Liga</span>
            <span>{club.league}</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-white/[0.02] rounded-xl">
            <span className="text-white/50">Plan</span>
            <span className="text-[#FFD700] font-bold">{club.plan}</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-white/[0.02] rounded-xl">
            <span className="text-white/50">Verifiziert</span>
            <span className={club.is_verified ? 'text-[#22C55E]' : 'text-white/50'}>{club.is_verified ? 'Ja' : 'Nein'}</span>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
            <Settings className="w-5 h-5 text-white/50" />
          </div>
          <div>
            <div className="font-bold">Branding & Team</div>
            <div className="text-xs text-white/50">Logo, Farben & Admin-Verwaltung</div>
          </div>
        </div>
        <div className="text-sm text-white/40 p-4 bg-white/[0.02] rounded-xl border border-dashed border-white/10 text-center">
          Logo-Upload, Farbanpassungen und Team-Management werden in Phase 7 freigeschaltet.
        </div>
      </Card>
    </div>
  );
}
