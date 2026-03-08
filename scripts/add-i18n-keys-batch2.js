const fs = require('fs');
const path = require('path');

// Read JSON files
const dePath = path.join(__dirname, '..', 'messages', 'de.json');
const trPath = path.join(__dirname, '..', 'messages', 'tr.json');
const de = JSON.parse(fs.readFileSync(dePath, 'utf8'));
const tr = JSON.parse(fs.readFileSync(trPath, 'utf8'));

// ── Community toast keys (community namespace) ──
const communityToastsDe = {
  voteError: "Fehler beim Abstimmen",
  deleteError: "Fehler beim Löschen",
  postRemoved: "Post entfernt",
  genericError: "Fehler",
  postPinned: "Post angepinnt",
  postUnpinned: "Post gelöst",
  noClubSelected: "Kein Club ausgewählt. Bitte zuerst einen Club folgen.",
  postCreateError: "Beitrag konnte nicht erstellt werden.",
  researchPublished: "Bericht veröffentlicht!",
  researchPublishError: "Bericht konnte nicht veröffentlicht werden",
  submitError: "Fehler beim Einreichen",
  researchUnlocked: "Bericht freigeschaltet!",
  ratingSaved: "Bewertung gespeichert!",
  voteCast: "Stimme abgegeben!",
  pollCancelled: "Umfrage abgebrochen",
};

const communityToastsTr = {
  voteError: "Oy verirken hata oluştu",
  deleteError: "Silinirken hata oluştu",
  postRemoved: "Gönderi kaldırıldı",
  genericError: "Hata",
  postPinned: "Gönderi sabitlendi",
  postUnpinned: "Gönderi sabitlemesi kaldırıldı",
  noClubSelected: "Kulüp seçilmedi. Lütfen önce bir kulüp takip edin.",
  postCreateError: "Gönderi oluşturulamadı.",
  researchPublished: "Rapor yayınlandı!",
  researchPublishError: "Rapor yayınlanamadı",
  submitError: "Gönderirken hata oluştu",
  researchUnlocked: "Rapor kilidi açıldı!",
  ratingSaved: "Değerlendirme kaydedildi!",
  voteCast: "Oy verildi!",
  pollCancelled: "Anket iptal edildi",
};

// ── bescoutAdmin namespace (new) ──
const bescoutAdminDe = {
  sponsors: "Sponsoren",
  sponsorCount: "{count} Einträge · {active} aktiv",
  newSponsor: "Neu",
  noSponsors: "Keine Sponsoren vorhanden",
  sponsorUpdated: "Sponsor aktualisiert",
  sponsorCreated: "Sponsor erstellt",
  confirmDeleteSponsor: "Sponsor wirklich löschen?",
  sponsorDeleted: "Sponsor gelöscht",
  editSponsor: "Sponsor bearbeiten",
  newSponsorTitle: "Neuer Sponsor",
  error: "Fehler",
  nameLabel: "Name",
  namePlaceholder: "z.B. Nike",
  logoUrlLabel: "Logo URL",
  preview: "Vorschau",
  linkUrlLabel: "Link URL (optional)",
  placementLabel: "Platzierung",
  priorityLabel: "Priorität",
  priorityInfo: "Priorität {priority}",
  unlimited: "Unbegrenzt",
  untilDate: "bis {date}",
  deactivate: "Deaktivieren",
  activate: "Aktivieren",
  edit: "Bearbeiten",
  delete: "Löschen",
  startLabel: "Start",
  endLabel: "Ende (optional)",
  saving: "Speichere...",
  update: "Aktualisieren",
  create: "Erstellen",
  sponsorKpis: "Sponsor-KPIs",
  estRevenue: "Est. Umsatz",
  noTrackingData: "Noch keine Tracking-Daten vorhanden",
  thSponsor: "Sponsor",
  thPlacement: "Platzierung",
  thImpressions: "Impressions",
  thClicks: "Clicks",
  thCtr: "CTR",
  placementHomeHero: "Home Hero",
  placementHomeMid: "Home Mitte",
  placementMarketTop: "Marktplatz",
  placementClubHero: "Club-Seite",
  placementPlayerMid: "Spieler Mitte",
  placementPlayerFooter: "Spieler Footer",
  placementEvent: "Fantasy Event",
  placementTransferlist: "Transferliste",
  placementIpo: "IPO-Bereich",
  placementPortfolio: "Portfolio",
  placementOffers: "Angebote",
  placementClubCommunity: "Club Community",
  placementClubPlayers: "Club Spieler",
  placementSpieltag: "Spieltag",
  placementPitch: "Fantasy Pitch",
  placementLeaderboard: "Fantasy Rangliste",
  placementHistory: "Fantasy Verlauf",
  placementProfileHero: "Profil Hero",
  placementProfileFooter: "Profil Footer",
  placementCommunityFeed: "Community Feed",
  placementCommunityResearch: "Community Research",
};

const bescoutAdminTr = {
  sponsors: "Sponsorlar",
  sponsorCount: "{count} kayıt · {active} aktif",
  newSponsor: "Yeni",
  noSponsors: "Henüz sponsor yok",
  sponsorUpdated: "Sponsor güncellendi",
  sponsorCreated: "Sponsor oluşturuldu",
  confirmDeleteSponsor: "Sponsor gerçekten silinsin mi?",
  sponsorDeleted: "Sponsor silindi",
  editSponsor: "Sponsoru düzenle",
  newSponsorTitle: "Yeni Sponsor",
  error: "Hata",
  nameLabel: "İsim",
  namePlaceholder: "örn. Nike",
  logoUrlLabel: "Logo URL",
  preview: "Önizleme",
  linkUrlLabel: "Link URL (isteğe bağlı)",
  placementLabel: "Yerleşim",
  priorityLabel: "Öncelik",
  priorityInfo: "Öncelik {priority}",
  unlimited: "Sınırsız",
  untilDate: "{date} tarihine kadar",
  deactivate: "Devre dışı bırak",
  activate: "Etkinleştir",
  edit: "Düzenle",
  delete: "Sil",
  startLabel: "Başlangıç",
  endLabel: "Bitiş (isteğe bağlı)",
  saving: "Kaydediliyor...",
  update: "Güncelle",
  create: "Oluştur",
  sponsorKpis: "Sponsor KPI'ları",
  estRevenue: "Tahmini Gelir",
  noTrackingData: "Henüz izleme verisi yok",
  thSponsor: "Sponsor",
  thPlacement: "Yerleşim",
  thImpressions: "Gösterimler",
  thClicks: "Tıklamalar",
  thCtr: "CTR",
  placementHomeHero: "Ana Sayfa Hero",
  placementHomeMid: "Ana Sayfa Orta",
  placementMarketTop: "Pazar Yeri",
  placementClubHero: "Kulüp Sayfası",
  placementPlayerMid: "Oyuncu Orta",
  placementPlayerFooter: "Oyuncu Alt",
  placementEvent: "Fantasy Etkinlik",
  placementTransferlist: "Transfer Listesi",
  placementIpo: "IPO Alanı",
  placementPortfolio: "Portföy",
  placementOffers: "Teklifler",
  placementClubCommunity: "Kulüp Topluluk",
  placementClubPlayers: "Kulüp Oyuncular",
  placementSpieltag: "Hafta",
  placementPitch: "Fantasy Kadro",
  placementLeaderboard: "Fantasy Sıralama",
  placementHistory: "Fantasy Geçmiş",
  placementProfileHero: "Profil Hero",
  placementProfileFooter: "Profil Alt",
  placementCommunityFeed: "Topluluk Akışı",
  placementCommunityResearch: "Topluluk Araştırma",
};

// Merge community toast keys
Object.assign(de.community, communityToastsDe);
Object.assign(tr.community, communityToastsTr);

// Create bescoutAdmin namespace
de.bescoutAdmin = bescoutAdminDe;
tr.bescoutAdmin = bescoutAdminTr;

// Write back
fs.writeFileSync(dePath, JSON.stringify(de, null, 2) + '\n', 'utf8');
fs.writeFileSync(trPath, JSON.stringify(tr, null, 2) + '\n', 'utf8');

const deCount = Object.keys(communityToastsDe).length + Object.keys(bescoutAdminDe).length;
const trCount = Object.keys(communityToastsTr).length + Object.keys(bescoutAdminTr).length;
console.log(`Added ${deCount} DE keys and ${trCount} TR keys`);
