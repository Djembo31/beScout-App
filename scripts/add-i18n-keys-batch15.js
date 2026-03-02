/**
 * Batch 15: Achievements (hidden), Expert Badges, Community Poll/Vote UI,
 * BottomNav, SpieltagTab status labels
 */
const fs = require('fs');
const path = require('path');

// Helper to set a nested key in an object (e.g. 'achievement.50_trades')
function setNested(obj, keyPath, value) {
  const parts = keyPath.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!cur[parts[i]]) cur[parts[i]] = {};
    cur = cur[parts[i]];
  }
  const last = parts[parts.length - 1];
  if (cur[last] === undefined) {
    cur[last] = value;
    return true;
  }
  return false;
}

const KEYS = {
  gamification: {
    // --- Hidden achievement labels + descriptions (17 missing) ---
    'achievement.50_trades':        { de: 'Profi-Händler', tr: 'Profesyonel Tüccar' },
    'achievement.50_tradesDesc':    { de: '50 Trades abgeschlossen', tr: '50 işlem tamamlandı' },
    'achievement.portfolio_1000':   { de: 'Sammler', tr: 'Koleksiyoncu' },
    'achievement.portfolio_1000Desc': { de: 'Kader über 1.000 $SCOUT', tr: '1.000 $SCOUT üstü kadro' },
    'achievement.diverse_5':        { de: 'Diversifiziert', tr: 'Çeşitlendirilmiş' },
    'achievement.diverse_5Desc':    { de: '5 verschiedene Spieler im Portfolio', tr: 'Portföyde 5 farklı oyuncu' },
    'achievement.diverse_15':       { de: 'Kader-Sammler', tr: 'Kadro Koleksiyoncusu' },
    'achievement.diverse_15Desc':   { de: '15 verschiedene Spieler im Portfolio', tr: 'Portföyde 15 farklı oyuncu' },
    'achievement.sell_order':       { de: 'Erstverkauf', tr: 'İlk Satış' },
    'achievement.sell_orderDesc':   { de: 'Ersten Sell-Order erstellt', tr: 'İlk satış emri oluşturuldu' },
    'achievement.diamond_hands':    { de: 'Diamond Hands', tr: 'Elmas Eller' },
    'achievement.diamond_handsDesc': { de: 'DPC 30 Tage gehalten ohne zu verkaufen', tr: "DPC'yi satmadan 30 gün tutma" },
    'achievement.3_events':         { de: 'Spieltag-Fan', tr: 'Maç Günü Hayranı' },
    'achievement.3_eventsDesc':     { de: '3 Fantasy-Events gespielt', tr: '3 fantezi etkinlik oynandı' },
    'achievement.5_events':         { de: 'Stammgast', tr: 'Devamlı Müşteri' },
    'achievement.5_eventsDesc':     { de: '5 Fantasy-Events gespielt', tr: '5 fantezi etkinlik oynandı' },
    'achievement.verified':         { de: 'Verifiziert', tr: 'Doğrulanmış' },
    'achievement.verifiedDesc':     { de: 'Profil verifiziert', tr: 'Profil doğrulandı' },
    'achievement.research_sold':    { de: 'Bestseller', tr: 'Çok Satan' },
    'achievement.research_soldDesc': { de: 'Erste Research-Analyse verkauft', tr: 'İlk araştırma analizi satıldı' },
    'achievement.5_followers':      { de: 'Aufsteiger', tr: 'Yükselen Yıldız' },
    'achievement.5_followersDesc':  { de: '5 Follower erreicht', tr: '5 takipçiye ulaşıldı' },
    'achievement.10_followers':     { de: 'Influencer', tr: 'Influencer' },
    'achievement.10_followersDesc': { de: '10 Follower erreicht', tr: '10 takipçiye ulaşıldı' },
    'achievement.50_followers':     { de: 'Community-Star', tr: 'Topluluk Yıldızı' },
    'achievement.50_followersDesc': { de: '50 Follower erreicht', tr: '50 takipçiye ulaşıldı' },
    'achievement.first_vote':       { de: 'Mitbestimmer', tr: 'Oy Veren' },
    'achievement.first_voteDesc':   { de: 'Erste Abstimmung abgegeben', tr: 'İlk oy kullanıldı' },
    'achievement.10_votes':         { de: 'Demokrat', tr: 'Demokrat' },
    'achievement.10_votesDesc':     { de: '10 Abstimmungen abgegeben', tr: '10 oy kullanıldı' },
    'achievement.first_bounty':     { de: 'Club Scout', tr: 'Kulüp Scoutu' },
    'achievement.first_bountyDesc': { de: 'Erste Bounty abgeschlossen', tr: 'İlk görev tamamlandı' },
    'achievement.founding_scout':   { de: 'Founding Scout', tr: 'Kurucu Scout' },
    'achievement.founding_scoutDesc': { de: 'Unter den ersten 50 Scouts auf BeScout', tr: "BeScout'un ilk 50 scoutu arasında" },
    // --- Achievement UI strings ---
    'achievement.showLess':  { de: 'Weniger anzeigen', tr: 'Daha az göster' },
    'achievement.showAll':   { de: 'Alle {count} anzeigen', tr: 'Tümünü göster ({count})' },
    // --- Expert badge labels + descriptions ---
    'badge.trading_expert':      { de: 'Trading-Experte', tr: 'Trading Uzmanı' },
    'badge.trading_expertDesc':  { de: 'Trading Score von mindestens 500 erreichen', tr: 'En az 500 Trading Puanına ulaş' },
    'badge.fantasy_pro':         { de: 'Fantasy-Profi', tr: 'Fantasy Profesyoneli' },
    'badge.fantasy_proDesc':     { de: 'Manager Score von mindestens 500 erreichen', tr: 'En az 500 Menajer Puanına ulaş' },
    'badge.star_scout':          { de: 'Star Scout', tr: 'Yıldız Scout' },
    'badge.star_scoutDesc':      { de: 'Scout Score von mindestens 500 erreichen', tr: 'En az 500 Scout Puanına ulaş' },
    'badge.top_10':              { de: 'Top 10', tr: 'İlk 10' },
    'badge.top_10Desc':          { de: 'Unter die Top 10 im Leaderboard kommen', tr: "Sıralamada ilk 10'a gir" },
    'badge.community_voice':     { de: 'Community Voice', tr: 'Topluluk Sesi' },
    'badge.community_voiceDesc': { de: 'Mindestens 20 Follower gewinnen', tr: 'En az 20 takipçi kazan' },
    'badge.rising_star':         { de: 'Aufsteiger', tr: 'Yükselen Yıldız' },
    'badge.rising_starDesc':     { de: 'Total Score ≥ 300 und Rang ≤ 30 erreichen', tr: 'Toplam Puan ≥ 300 ve Sıralama ≤ 30' },
  },
  community: {
    paidPollLabel:     { de: 'Bezahlte Umfrage', tr: 'Ücretli Anket' },
    cancelledLabel:    { de: 'Abgebrochen', tr: 'İptal Edildi' },
    byCreatorPrefix:   { de: 'von', tr: 'tarafından' },
    yourPollLabel:     { de: 'Deine Umfrage', tr: 'Senin Anketin' },
    votedLabel:        { de: 'Abgestimmt', tr: 'Oy Verildi' },
    cancelPollLabel:   { de: 'Umfrage abbrechen', tr: 'Anketi İptal Et' },
    clubVoteLabel:     { de: 'Club-Abstimmung', tr: 'Kulüp Oylaması' },
    votesTabTitle:     { de: 'Abstimmungen', tr: 'Oylamalar' },
    createPollBtn:     { de: 'Umfrage erstellen', tr: 'Anket Oluştur' },
    clubVotesDivider:  { de: 'Club-Abstimmungen', tr: 'Kulüp Oylamaları' },
    noVotesYet:        { de: 'Noch keine Abstimmungen', tr: 'Henüz oylama yok' },
    noVotesHint:       { de: 'Erstelle die erste bezahlte Umfrage!', tr: 'İlk ücretli anketi oluştur!' },
    createFirstPollBtn: { de: 'Erste Umfrage erstellen', tr: 'İlk Anketi Oluştur' },
    pollEndedLabel:    { de: 'Beendet', tr: 'Sona Erdi' },
  },
  common: {
    navHome:      { de: 'Home', tr: 'Ana Sayfa' },
    navSpieltag:  { de: 'Spieltag', tr: 'Maç Günü' },
    navMarkt:     { de: 'Markt', tr: 'Pazar' },
    navClub:      { de: 'Club', tr: 'Kulüp' },
    navCommunity: { de: 'Community', tr: 'Topluluk' },
  },
  fantasy: {
    gwSimulatedLabel: { de: 'Beendet', tr: 'Tamamlandı' },
    startSimulation:  { de: 'Starten', tr: 'Başlat' },
  },
};

['de', 'tr'].forEach(locale => {
  const filePath = path.join(__dirname, '..', 'messages', `${locale}.json`);
  const json = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  let added = 0;

  Object.entries(KEYS).forEach(([ns, keys]) => {
    if (!json[ns]) json[ns] = {};
    Object.entries(keys).forEach(([keyPath, values]) => {
      if (setNested(json[ns], keyPath, values[locale])) added++;
    });
  });

  fs.writeFileSync(filePath, JSON.stringify(json, null, 2) + '\n');
  console.log(`${locale}: ${added} keys added`);
});
