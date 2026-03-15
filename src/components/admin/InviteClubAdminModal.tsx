'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';
import { Modal, Button } from '@/components/ui';
import { useToast } from '@/components/providers/ToastProvider';

interface InviteClubAdminModalProps {
  open: boolean;
  onClose: () => void;
  clubId: string;
  clubName: string;
  onInvited?: () => void;
}

export default function InviteClubAdminModal({ open, onClose, clubId, clubName, onInvited }: InviteClubAdminModalProps) {
  const { addToast } = useToast();
  const t = useTranslations('admin');
  const tc = useTranslations('common');
  const ta = useTranslations('adminApi');

  const ROLES = [
    { value: 'owner', label: 'Owner', desc: t('roleOwnerDesc') },
    { value: 'admin', label: 'Admin', desc: t('roleAdminDesc') },
    { value: 'editor', label: 'Editor', desc: t('roleEditorDesc') },
  ];
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('admin');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@')) {
      addToast(t('invalidEmail'), 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/admin/invite-club-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed, clubId, role }),
      });

      const data = await res.json();
      if (data.success) {
        const msg = data.messageKey ? ta(data.messageKey, data.params ?? {}) : t('invited', { email: trimmed });
        addToast(msg, 'success');
        onInvited?.();
        onClose();
        setEmail('');
        setRole('admin');
      } else {
        const errMsg = data.errorKey ? ta(data.errorKey, data.params ?? {}) : t('inviteFailed');
        addToast(errMsg, 'error');
      }
    } catch (err) {
      addToast(err instanceof Error ? err.message : t('networkError'), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      title={t('inviteTitle')}
      subtitle={t('inviteSubtitle', { club: clubName })}
      onClose={onClose}
      footer={
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={onClose} disabled={loading}>{tc('cancel')}</Button>
          <Button variant="gold" onClick={handleSubmit} disabled={loading || !email.trim()}>
            {loading ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : t('invite')}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Email */}
        <div>
          <label htmlFor="invite-email" className="block text-xs text-white/60 mb-1">{t('emailLabel')}</label>
          <input
            id="invite-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@club.com"
            className="w-full px-3 py-2.5 min-h-[44px] rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-gold/50"
            inputMode="email"
            autoComplete="email"
          />
        </div>

        {/* Role */}
        <div>
          <label className="block text-xs text-white/60 mb-2">{t('roleLabel')}</label>
          <div className="space-y-2">
            {ROLES.map(r => (
              <label
                key={r.value}
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors min-h-[44px] ${
                  role === r.value
                    ? 'bg-gold/10 border-gold/30'
                    : 'bg-surface-minimal border-white/10 hover:bg-white/[0.04]'
                }`}
              >
                <input
                  type="radio"
                  name="invite-role"
                  value={r.value}
                  checked={role === r.value}
                  onChange={() => setRole(r.value)}
                  className="accent-gold"
                />
                <div>
                  <span className="text-sm font-bold text-white">{r.label}</span>
                  <p className="text-xs text-white/40 text-pretty">{r.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <p className="text-xs text-white/30 text-pretty">
          {t('inviteInfo')}
        </p>
      </div>
    </Modal>
  );
}
