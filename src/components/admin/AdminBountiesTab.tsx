'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Target, Clock, Users, Loader2, Eye, CheckCircle, XCircle, X, AlertTriangle, Telescope } from 'lucide-react';
import { Card, Button, Chip, Modal } from '@/components/ui';
import { useUser } from '@/components/providers/AuthProvider';
import { formatScout } from '@/lib/services/wallet';
import {
  getBountiesByClub,
  createBounty,
  cancelBounty,
  getBountySubmissions,
  approveBountySubmission,
  rejectBountySubmission,
  invalidateBountyData,
} from '@/lib/services/bounties';
import type { ClubWithAdmin, BountyWithCreator, BountySubmissionWithUser } from '@/types';
import { useTranslations } from 'next-intl';

export default function AdminBountiesTab({ club }: { club: ClubWithAdmin }) {
  const { user } = useUser();
  const t = useTranslations('bountyAdmin');
  const [bounties, setBounties] = useState<BountyWithCreator[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Create modal
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [reward, setReward] = useState('10');
  const [days, setDays] = useState('7');
  const [maxSubs, setMaxSubs] = useState('5');
  const [minTier, setMinTier] = useState('');
  const [bountyType, setBountyType] = useState<'general' | 'scouting'>('general');
  const [creating, setCreating] = useState(false);

  // Submissions modal
  const [viewBountyId, setViewBountyId] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<BountySubmissionWithUser[]>([]);
  const [subsLoading, setSubsLoading] = useState(false);

  // Review modal
  const [reviewSub, setReviewSub] = useState<BountySubmissionWithUser | null>(null);
  const [feedback, setFeedback] = useState('');
  const [reviewing, setReviewing] = useState(false);

  const reload = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      invalidateBountyData(user.id, club.id);
      const data = await getBountiesByClub(club.id, user.id);
      setBounties(data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [club.id, user]);

  useEffect(() => { reload(); }, [reload]);

  const handleCreate = useCallback(async () => {
    if (!user || creating) return;
    if (!title.trim() || !description.trim()) return;
    setCreating(true);
    setMsg(null);
    try {
      await createBounty({
        userId: user.id,
        clubId: club.id,
        clubName: club.name,
        title: title.trim(),
        description: description.trim(),
        rewardCents: Math.round(parseFloat(reward || '10') * 100),
        deadlineDays: parseInt(days || '7'),
        maxSubmissions: parseInt(maxSubs || '5'),
        minTier: minTier || null,
        type: bountyType,
      });
      setCreateOpen(false);
      setTitle('');
      setDescription('');
      setReward('10');
      setDays('7');
      setMaxSubs('5');
      setMinTier('');
      setBountyType('general');
      await reload();
      setMsg({ type: 'success', text: t('bountyCreated') });
    } catch (err) {
      setMsg({ type: 'error', text: err instanceof Error ? err.message : t('error') });
    } finally {
      setCreating(false);
    }
  }, [user, creating, title, description, reward, days, maxSubs, club, reload, t, minTier, bountyType]);

  const handleCancel = useCallback(async (bountyId: string) => {
    if (!user) return;
    try {
      await cancelBounty(user.id, bountyId);
      await reload();
      setMsg({ type: 'success', text: t('bountyCancelled') });
    } catch (err) {
      setMsg({ type: 'error', text: err instanceof Error ? err.message : t('error') });
    }
  }, [user, reload, t]);

  const handleViewSubmissions = useCallback(async (bountyId: string) => {
    setViewBountyId(bountyId);
    setSubsLoading(true);
    try {
      const data = await getBountySubmissions(bountyId);
      setSubmissions(data);
    } catch {
      setSubmissions([]);
    } finally {
      setSubsLoading(false);
    }
  }, []);

  const handleApprove = useCallback(async () => {
    if (!user || !reviewSub || reviewing) return;
    setReviewing(true);
    try {
      const result = await approveBountySubmission(user.id, reviewSub.id, feedback || undefined);
      if (result.success) {
        setReviewSub(null);
        setFeedback('');
        setMsg({ type: 'success', text: t('submissionApproved') });
        // Refresh submissions + bounties
        if (viewBountyId) {
          invalidateBountyData(user.id, club.id);
          const [subs] = await Promise.all([getBountySubmissions(viewBountyId), reload()]);
          setSubmissions(subs);
        }
      } else {
        setMsg({ type: 'error', text: result.error ?? t('error') });
      }
    } catch (err) {
      setMsg({ type: 'error', text: err instanceof Error ? err.message : t('error') });
    } finally {
      setReviewing(false);
    }
  }, [user, reviewSub, reviewing, feedback, viewBountyId, club.id, reload, t]);

  const handleReject = useCallback(async () => {
    if (!user || !reviewSub || reviewing) return;
    setReviewing(true);
    try {
      const result = await rejectBountySubmission(user.id, reviewSub.id, feedback || undefined);
      if (result.success) {
        setReviewSub(null);
        setFeedback('');
        setMsg({ type: 'success', text: t('submissionRejected') });
        if (viewBountyId) {
          const subs = await getBountySubmissions(viewBountyId);
          setSubmissions(subs);
        }
      } else {
        setMsg({ type: 'error', text: result.error ?? t('error') });
      }
    } catch (err) {
      setMsg({ type: 'error', text: err instanceof Error ? err.message : t('error') });
    } finally {
      setReviewing(false);
    }
  }, [user, reviewSub, reviewing, feedback, viewBountyId, t]);

  const openBounties = bounties.filter(b => b.status === 'open');
  const closedBounties = bounties.filter(b => b.status !== 'open');
  const viewBounty = bounties.find(b => b.id === viewBountyId);

  return (
    <div className="space-y-6">
      {msg && (
        <div className={`px-4 py-3 rounded-xl text-sm font-bold ${msg.type === 'success' ? 'bg-[#22C55E]/20 border border-[#22C55E]/30 text-[#22C55E]' : 'bg-red-500/20 border border-red-500/30 text-red-300'}`}>{msg.text}</div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black">{t('heading')}</h2>
          <p className="text-xs text-white/50">{t('statsOpen', { count: openBounties.length })} &bull; {t('statsClosed', { count: closedBounties.length })}</p>
        </div>
        <Button variant="gold" onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4" />
          {t('newBounty')}
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <Card key={i} className="h-24 animate-pulse" />)}</div>
      ) : bounties.length === 0 ? (
        <Card className="p-12 text-center">
          <Target className="w-12 h-12 mx-auto mb-4 text-white/20" />
          <div className="text-white/30 font-bold">{t('noBounties')}</div>
          <div className="text-xs text-white/20 mt-1">{t('createFirst')}</div>
        </Card>
      ) : (
        <div className="space-y-4">
          {bounties.map(bounty => {
            const isOpen = bounty.status === 'open' && new Date(bounty.deadline_at) > new Date();
            const diffMs = new Date(bounty.deadline_at).getTime() - Date.now();
            const d = Math.floor(diffMs / 86400000);
            const h = Math.floor((diffMs % 86400000) / 3600000);
            return (
              <Card key={bounty.id} className={`p-4 ${!isOpen ? 'opacity-60' : ''}`}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-bold line-clamp-1 flex items-center gap-2">
                      {bounty.title}
                      {bounty.type === 'scouting' && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/20 shrink-0">
                          <Telescope className="w-2.5 h-2.5" />
                          {t('scouting')}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-white/40 line-clamp-2 mt-1">{bounty.description}</div>
                  </div>
                  <Chip className={isOpen ? 'bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E]/25 ml-2' : 'bg-white/5 text-white/50 border-white/10 ml-2'}>
                    {bounty.status === 'cancelled' ? t('cancelled') : isOpen ? t('open') : t('closed')}
                  </Chip>
                </div>

                {bounty.player_name && (
                  <div className="text-xs text-amber-400 mb-2">{t('playerLabel', { name: bounty.player_name })}</div>
                )}

                <div className="flex items-center justify-between text-xs text-white/50 mb-3">
                  <span className="text-[#FFD700] font-bold">{formatScout(bounty.reward_cents)} $SCOUT</span>
                  <span><Users className="w-3 h-3 inline mr-1" />{bounty.submission_count}/{bounty.max_submissions}</span>
                  <span><Clock className="w-3 h-3 inline mr-1" />{diffMs > 0 ? `${d}d ${h}h` : t('expired')}</span>
                </div>

                <div className="flex items-center gap-2">
                  {bounty.submission_count > 0 && (
                    <Button variant="outline" size="sm" onClick={() => handleViewSubmissions(bounty.id)}>
                      <Eye className="w-3.5 h-3.5" />
                      {t('submissions', { count: bounty.submission_count })}
                    </Button>
                  )}
                  {isOpen && bounty.submission_count === 0 && bounty.status !== 'cancelled' && (
                    <Button variant="outline" size="sm" onClick={() => handleCancel(bounty.id)}>
                      <X className="w-3.5 h-3.5" />
                      {t('cancel')}
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Bounty Modal */}
      <Modal open={createOpen} title={t('newBounty')} onClose={() => setCreateOpen(false)}>
        <div className="space-y-4">
          {/* Type Toggle */}
          <div>
            <label className="text-xs text-white/50 font-semibold mb-1.5 block">{t('type')}</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setBountyType('general')}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold border transition-all ${
                  bountyType === 'general'
                    ? 'bg-amber-500/15 text-amber-300 border-amber-500/25'
                    : 'bg-white/5 text-white/50 border-white/10 hover:bg-white/10'
                }`}
              >
                <Target className="w-4 h-4" />
                {t('general')}
              </button>
              <button
                type="button"
                onClick={() => setBountyType('scouting')}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold border transition-all ${
                  bountyType === 'scouting'
                    ? 'bg-rose-500/15 text-rose-300 border-rose-500/25'
                    : 'bg-white/5 text-white/50 border-white/10 hover:bg-white/10'
                }`}
              >
                <Telescope className="w-4 h-4" />
                {t('scouting')}
              </button>
            </div>
            {bountyType === 'scouting' && (
              <div className="text-[10px] text-rose-300 mt-1">{t('scoutingHint')}</div>
            )}
          </div>
          <div>
            <label className="text-xs text-white/50 font-semibold mb-1.5 block">{t('title')}</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, 200))}
              placeholder={t('titlePlaceholder')}
              className="w-full px-4 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-[#FFD700]/40"
            />
          </div>
          <div>
            <label className="text-xs text-white/50 font-semibold mb-1.5 block">{t('description')}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 2000))}
              rows={4}
              placeholder={t('descPlaceholder')}
              className="w-full px-4 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-[#FFD700]/40 resize-none"
            />
            <div className="text-[10px] text-white/30 mt-1">{t('charCount', { count: description.length })}</div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-white/50 font-semibold mb-1.5 block">{t('reward')}</label>
              <input
                type="number"
                inputMode="numeric"
                value={reward}
                onChange={(e) => setReward(e.target.value)}
                min="5"
                max="1000"
                className="w-full px-4 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#FFD700]/40"
              />
            </div>
            <div>
              <label className="text-xs text-white/50 font-semibold mb-1.5 block">{t('deadline')}</label>
              <input
                type="number"
                inputMode="numeric"
                value={days}
                onChange={(e) => setDays(e.target.value)}
                min="1"
                max="30"
                className="w-full px-4 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#FFD700]/40"
              />
            </div>
            <div>
              <label className="text-xs text-white/50 font-semibold mb-1.5 block">{t('maxSubmissions')}</label>
              <input
                type="number"
                inputMode="numeric"
                value={maxSubs}
                onChange={(e) => setMaxSubs(e.target.value)}
                min="1"
                max="50"
                className="w-full px-4 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#FFD700]/40"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-white/50 font-semibold mb-1.5 block">{t('minTier')}</label>
            <select
              value={minTier}
              onChange={(e) => setMinTier(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#FFD700]/40"
            >
              <option value="">{t('allTiers')}</option>
              <option value="bronze">{t('bronzePlus')}</option>
              <option value="silber">{t('silberPlus')}</option>
              <option value="gold">{t('goldOnly')}</option>
            </select>
            {minTier && (
              <div className="text-[10px] text-amber-300 mt-1">{t('tierOnlyHint', { tier: minTier === 'bronze' ? 'Bronze+' : minTier === 'silber' ? 'Silber+' : 'Gold' })}</div>
            )}
          </div>
          <Button variant="gold" fullWidth loading={creating} onClick={handleCreate}>
            {t('createBounty')}
          </Button>
        </div>
      </Modal>

      {/* Submissions Modal */}
      <Modal
        open={!!viewBountyId}
        title={viewBounty ? t('submissionsTitle', { title: viewBounty.title }) : t('submissionsHeading')}
        onClose={() => { setViewBountyId(null); setSubmissions([]); }}
      >
        {subsLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-white/30" />
          </div>
        ) : submissions.length === 0 ? (
          <div className="py-8 text-center text-sm text-white/30">{t('noSubmissions')}</div>
        ) : (
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {submissions.map(sub => (
              <Card key={sub.id} className="p-3">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-bold text-sm">{sub.title}</div>
                    <div className="text-xs text-white/40">{t('by', { handle: sub.user_handle })}</div>
                  </div>
                  <Chip className={
                    sub.status === 'approved' ? 'bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E]/25' :
                    sub.status === 'rejected' ? 'bg-red-500/15 text-red-300 border-red-500/25' :
                    'bg-amber-500/15 text-amber-300 border-amber-500/25'
                  }>
                    {sub.status === 'approved' ? t('approved') : sub.status === 'rejected' ? t('rejected') : t('pending')}
                  </Chip>
                </div>
                <div className="text-xs text-white/60 line-clamp-3 mb-2">{sub.content}</div>
                {sub.admin_feedback && (
                  <div className="text-xs text-white/40 italic mb-2">{t('feedbackPrefix', { text: sub.admin_feedback })}</div>
                )}
                {sub.status === 'pending' && (
                  <Button variant="outline" size="sm" onClick={() => { setReviewSub(sub); setFeedback(''); }}>
                    {t('review')}
                  </Button>
                )}
              </Card>
            ))}
          </div>
        )}
      </Modal>

      {/* Review Modal */}
      <Modal
        open={!!reviewSub}
        title={t('reviewTitle')}
        onClose={() => { setReviewSub(null); setFeedback(''); }}
      >
        {reviewSub && (
          <div className="space-y-4">
            <div>
              <div className="text-xs text-white/50 font-semibold mb-1">{t('titleLabel')}</div>
              <div className="font-bold">{reviewSub.title}</div>
            </div>
            <div>
              <div className="text-xs text-white/50 font-semibold mb-1">{t('fromLabel')}</div>
              <div className="text-sm">@{reviewSub.user_handle} {reviewSub.user_display_name ? `(${reviewSub.user_display_name})` : ''}</div>
            </div>
            <div>
              <div className="text-xs text-white/50 font-semibold mb-1">{t('contentLabel')}</div>
              <div className="text-sm text-white/80 bg-white/[0.02] border border-white/10 rounded-xl p-3 max-h-[200px] overflow-y-auto whitespace-pre-wrap">{reviewSub.content}</div>
            </div>
            <div>
              <label className="text-xs text-white/50 font-semibold mb-1.5 block">{t('feedbackLabel')}</label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value.slice(0, 500))}
                rows={2}
                placeholder={t('feedbackPlaceholder')}
                className="w-full px-4 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-[#FFD700]/40 resize-none"
              />
            </div>
            {viewBounty && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{t('approvalCost', { reward: formatScout(viewBounty.reward_cents) })}</span>
              </div>
            )}
            <div className="flex items-center gap-3">
              <Button variant="gold" className="flex-1" loading={reviewing} onClick={handleApprove}>
                <CheckCircle className="w-4 h-4" />
                {t('approve')}
              </Button>
              <button
                onClick={handleReject}
                disabled={reviewing}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-red-500/15 border border-red-500/25 text-red-300 hover:bg-red-500/25 transition-colors disabled:opacity-50"
              >
                <XCircle className="w-4 h-4" />
                {t('reject')}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
