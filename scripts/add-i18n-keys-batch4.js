const fs = require('fs');
const path = require('path');

const dePath = path.join(__dirname, '..', 'messages', 'de.json');
const trPath = path.join(__dirname, '..', 'messages', 'tr.json');
const de = JSON.parse(fs.readFileSync(dePath, 'utf8'));
const tr = JSON.parse(fs.readFileSync(trPath, 'utf8'));

// ── common (extend) — error page shared ──
const commonExtDe = {
  errorTitle: "Etwas ist schiefgelaufen",
  errorDesc: "Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es erneut.",
};
const commonExtTr = {
  errorTitle: "Bir şeyler ters gitti",
  errorDesc: "Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.",
};

// ── market (extend) — error page ──
const marketExtDe = {
  errorTitle: "Marktplatz nicht verfügbar",
  errorDesc: "Im Marktplatz ist ein Fehler aufgetreten. Deine DPCs und Orders sind sicher gespeichert.",
};
const marketExtTr = {
  errorTitle: "Pazar yeri kullanılamıyor",
  errorDesc: "Pazar yerinde bir hata oluştu. DPC'lerin ve siparişlerin güvenle kaydedildi.",
};

// ── fantasy (extend) — error page ──
const fantasyExtDe = {
  errorTitle: "Fantasy-Bereich nicht verfügbar",
  errorDesc: "Im Fantasy-Bereich ist ein Fehler aufgetreten. Deine Lineups und Ergebnisse sind sicher gespeichert.",
};
const fantasyExtTr = {
  errorTitle: "Fantasy bölümü kullanılamıyor",
  errorDesc: "Fantasy bölümünde bir hata oluştu. Kadrolarınız ve sonuçlarınız güvenle kaydedildi.",
};

// ── community (extend) — error page ──
const communityExtDe = {
  errorTitle: "Community nicht verfügbar",
  errorDesc: "Im Community-Bereich ist ein Fehler aufgetreten. Deine Posts und Beiträge sind sicher gespeichert.",
};
const communityExtTr = {
  errorTitle: "Topluluk kullanılamıyor",
  errorDesc: "Topluluk bölümünde bir hata oluştu. Gönderileriniz güvenle kaydedildi.",
};

// ── auth (extend) — error page ──
const authExtDe = {
  errorTitle: "Fehler",
  errorDesc: "Ein Fehler ist aufgetreten. Bitte versuche es erneut.",
};
const authExtTr = {
  errorTitle: "Hata",
  errorDesc: "Bir hata oluştu. Lütfen tekrar deneyin.",
};

// ── player (extend) — not-found + trading hooks ──
const playerExtDe = {
  notFoundTitle: "Spieler nicht gefunden",
  notFoundDesc: "Dieser Spieler existiert nicht oder wurde entfernt.",
  toMarket: "Zum Marktplatz",
  buyFailed: "Kauf fehlgeschlagen",
  buySuccess: "{quantity} DPC vom Transfermarkt für {price} $SCOUT gekauft",
  ipoBuyFailed: "IPO-Kauf fehlgeschlagen",
  ipoBuySuccess: "{quantity} DPC per IPO für {price} $SCOUT gekauft",
  listFailed: "Listing fehlgeschlagen",
  listSuccess: "{quantity} DPC für {price} $SCOUT gelistet",
  cancelFailed: "Stornierung fehlgeschlagen",
  orderCancelled: "Order storniert!",
  buyOfferCreated: "Kaufangebot erstellt",
  shareFailed: "Teilen fehlgeschlagen",
  postCreated: "Beitrag gepostet!",
  postCreateError: "Beitrag konnte nicht erstellt werden",
};
const playerExtTr = {
  notFoundTitle: "Oyuncu bulunamadı",
  notFoundDesc: "Bu oyuncu mevcut değil veya kaldırılmış.",
  toMarket: "Pazar yerine git",
  buyFailed: "Satın alma başarısız",
  buySuccess: "{quantity} DPC transfer listesinden {price} $SCOUT'a satın alındı",
  ipoBuyFailed: "IPO satın alma başarısız",
  ipoBuySuccess: "{quantity} DPC IPO ile {price} $SCOUT'a satın alındı",
  listFailed: "Listeleme başarısız",
  listSuccess: "{quantity} DPC {price} $SCOUT'a listelendi",
  cancelFailed: "İptal başarısız",
  orderCancelled: "Sipariş iptal edildi!",
  buyOfferCreated: "Satın alma teklifi oluşturuldu",
  shareFailed: "Paylaşım başarısız",
  postCreated: "Gönderi paylaşıldı!",
  postCreateError: "Gönderi oluşturulamadı",
};

// ── club (extend) — not-found ──
const clubExtDe = {
  notFoundDescGeneric: "Dieser Club existiert nicht oder wurde entfernt.",
  discoverClubs: "Clubs entdecken",
};
const clubExtTr = {
  notFoundDescGeneric: "Bu kulüp mevcut değil veya kaldırılmış.",
  discoverClubs: "Kulüpleri keşfet",
};

// ── bescoutAdmin (extend) — AdminClubsTab + AdminCreatorFundTab + CreateClubModal ──
const bescoutAdminExtDe = {
  // AdminClubsTab
  clubsLoadError: "Clubs konnten nicht geladen werden.",
  createClubBtn: "Club erstellen",
  noClubs: "Noch keine Clubs vorhanden.",
  clubPlayers: "Spieler",
  clubFollowers: "Follower",
  inviteAdmin: "Admin für {club} einladen",
  // AdminCreatorFundTab
  cfPaidLabel: "Creator Fund Ausgezahlt",
  cfPayoutsLabel: "Creator Fund Payouts",
  adPaidLabel: "Werbeanteil Ausgezahlt",
  adPayoutsLabel: "Werbeanteil Payouts",
  triggerPayouts: "Auszahlungen auslösen (letzte 7 Tage)",
  cfPayoutBtn: "Creator Fund Auszahlen",
  adPayoutBtn: "Werbeanteil Auszahlen",
  cfPayoutResult: "Creator Fund: {count} Creators bezahlt, {amount} $SCOUT ausgezahlt",
  adPayoutResult: "Werbeanteil: {count} Creators bezahlt, {amount} $SCOUT ausgezahlt",
  payoutError: "Fehler: {error}",
  lastPayoutsTitle: "Letzte Auszahlungen",
  thPayoutType: "Typ",
  thPeriod: "Zeitraum",
  thShare: "Anteil",
  thPayoutAmount: "Betrag",
  thPayoutStatus: "Status",
  payoutStatusPaid: "Bezahlt",
  payoutStatusRolledOver: "Übertragen",
  payoutStatusPending: "Ausstehend",
  // CreateClubModal
  fillRequired: "Bitte fülle alle Pflichtfelder aus.",
  clubCreated: "Club \"{name}\" erstellt!",
  clubCreateError: "Club konnte nicht erstellt werden.",
  createClubTitle: "Club erstellen",
  createClubSubtitle: "Neuen Club auf der Plattform anlegen",
  clubNameLabel: "Name *",
  clubNamePlaceholder: "z.B. Sakaryaspor",
  slugLabel: "Slug *",
  shortLabel: "Kürzel *",
  clubLeagueLabel: "Liga *",
  clubCountryLabel: "Land *",
  cityLabel: "Stadt",
  planLabel: "Paket",
};
const bescoutAdminExtTr = {
  clubsLoadError: "Kulüpler yüklenemedi.",
  createClubBtn: "Kulüp oluştur",
  noClubs: "Henüz kulüp yok.",
  clubPlayers: "Oyuncular",
  clubFollowers: "Takipçiler",
  inviteAdmin: "{club} için admin davet et",
  cfPaidLabel: "Creator Fund Ödendi",
  cfPayoutsLabel: "Creator Fund Ödemeler",
  adPaidLabel: "Reklam Payı Ödendi",
  adPayoutsLabel: "Reklam Payı Ödemeler",
  triggerPayouts: "Ödemeleri başlat (son 7 gün)",
  cfPayoutBtn: "Creator Fund Öde",
  adPayoutBtn: "Reklam Payı Öde",
  cfPayoutResult: "Creator Fund: {count} Creator'a ödendi, {amount} $SCOUT dağıtıldı",
  adPayoutResult: "Reklam Payı: {count} Creator'a ödendi, {amount} $SCOUT dağıtıldı",
  payoutError: "Hata: {error}",
  lastPayoutsTitle: "Son Ödemeler",
  thPayoutType: "Tür",
  thPeriod: "Dönem",
  thShare: "Pay",
  thPayoutAmount: "Tutar",
  thPayoutStatus: "Durum",
  payoutStatusPaid: "Ödendi",
  payoutStatusRolledOver: "Aktarıldı",
  payoutStatusPending: "Beklemede",
  fillRequired: "Lütfen tüm zorunlu alanları doldurun.",
  clubCreated: "\"{name}\" kulübü oluşturuldu!",
  clubCreateError: "Kulüp oluşturulamadı.",
  createClubTitle: "Kulüp oluştur",
  createClubSubtitle: "Platformda yeni kulüp oluştur",
  clubNameLabel: "İsim *",
  clubNamePlaceholder: "örn. Sakaryaspor",
  slugLabel: "Slug *",
  shortLabel: "Kısaltma *",
  clubLeagueLabel: "Lig *",
  clubCountryLabel: "Ülke *",
  cityLabel: "Şehir",
  planLabel: "Paket",
};

// ── admin (extend) — AdminWithdrawalTab ──
const adminExtDe = {
  withdrawalTitle: "Auszahlung",
  wdAvailable: "Verfügbar",
  wdTotalEarned: "Gesamt verdient",
  wdTradingFees: "Trading-Fees",
  wdAlreadyPaid: "Bereits ausgezahlt",
  wdRequestTitle: "Auszahlung beantragen",
  wdAmountLabel: "Betrag ($SCOUT)",
  wdAmountPlaceholder: "z.B. 500",
  wdNoteLabel: "Notiz (optional)",
  wdNotePlaceholder: "z.B. Monatliche Auszahlung",
  wdSubmitBtn: "Auszahlung beantragen",
  wdMinAmount: "Mindestbetrag: 1 $SCOUT.",
  wdInsufficientBalance: "Nicht genug Guthaben. Verfügbar: {available} $SCOUT.",
  wdCreated: "Auszahlungsantrag erstellt!",
  wdCreateError: "Fehler beim Erstellen.",
  wdUnknownError: "Unbekannter Fehler.",
  wdHistoryTitle: "Auszahlungsverlauf",
  wdNoWithdrawals: "Noch keine Auszahlungen beantragt.",
  wdStatusPending: "Ausstehend",
  wdStatusApproved: "Genehmigt",
  wdStatusRejected: "Abgelehnt",
  wdStatusPaid: "Ausgezahlt",
};
const adminExtTr = {
  withdrawalTitle: "Ödeme",
  wdAvailable: "Kullanılabilir",
  wdTotalEarned: "Toplam kazanılan",
  wdTradingFees: "İşlem Ücretleri",
  wdAlreadyPaid: "Zaten ödenmiş",
  wdRequestTitle: "Ödeme talep et",
  wdAmountLabel: "Tutar ($SCOUT)",
  wdAmountPlaceholder: "örn. 500",
  wdNoteLabel: "Not (isteğe bağlı)",
  wdNotePlaceholder: "örn. Aylık ödeme",
  wdSubmitBtn: "Ödeme talep et",
  wdMinAmount: "Minimum tutar: 1 $SCOUT.",
  wdInsufficientBalance: "Yeterli bakiye yok. Kullanılabilir: {available} $SCOUT.",
  wdCreated: "Ödeme talebi oluşturuldu!",
  wdCreateError: "Oluştururken hata.",
  wdUnknownError: "Bilinmeyen hata.",
  wdHistoryTitle: "Ödeme Geçmişi",
  wdNoWithdrawals: "Henüz ödeme talep edilmedi.",
  wdStatusPending: "Beklemede",
  wdStatusApproved: "Onaylandı",
  wdStatusRejected: "Reddedildi",
  wdStatusPaid: "Ödendi",
};

// Merge all
Object.assign(de.common, commonExtDe);
Object.assign(tr.common, commonExtTr);
Object.assign(de.market, marketExtDe);
Object.assign(tr.market, marketExtTr);
Object.assign(de.fantasy, fantasyExtDe);
Object.assign(tr.fantasy, fantasyExtTr);
Object.assign(de.community, communityExtDe);
Object.assign(tr.community, communityExtTr);
Object.assign(de.auth, authExtDe);
Object.assign(tr.auth, authExtTr);
Object.assign(de.player, playerExtDe);
Object.assign(tr.player, playerExtTr);
Object.assign(de.club, clubExtDe);
Object.assign(tr.club, clubExtTr);
Object.assign(de.bescoutAdmin, bescoutAdminExtDe);
Object.assign(tr.bescoutAdmin, bescoutAdminExtTr);
Object.assign(de.admin, adminExtDe);
Object.assign(tr.admin, adminExtTr);

// Write back
fs.writeFileSync(dePath, JSON.stringify(de, null, 2) + '\n', 'utf8');
fs.writeFileSync(trPath, JSON.stringify(tr, null, 2) + '\n', 'utf8');

const total = Object.keys(commonExtDe).length + Object.keys(marketExtDe).length +
  Object.keys(fantasyExtDe).length + Object.keys(communityExtDe).length +
  Object.keys(authExtDe).length + Object.keys(playerExtDe).length +
  Object.keys(clubExtDe).length + Object.keys(bescoutAdminExtDe).length +
  Object.keys(adminExtDe).length;
console.log(`Added ${total} DE keys and ${total} TR keys across 9 namespaces`);
