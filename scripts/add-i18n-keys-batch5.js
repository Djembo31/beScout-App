const fs = require('fs');
const path = require('path');

const dePath = path.join(__dirname, '..', 'messages', 'de.json');
const trPath = path.join(__dirname, '..', 'messages', 'tr.json');
const de = JSON.parse(fs.readFileSync(dePath, 'utf8'));
const tr = JSON.parse(fs.readFileSync(trPath, 'utf8'));

// ── auth (extend) — onboarding + callback ──
const authExtDe = {
  // Onboarding
  createProfile: "Erstelle dein Manager-Profil",
  yourProfile: "Dein Profil",
  chooseHandle: "Wähle deinen einzigartigen Handle für BeScout.",
  chooseHandleAndPw: "Handle wählen und Passwort setzen für zukünftige Anmeldungen.",
  handleLabel: "Handle",
  handlePlaceholder: "dein_name",
  handleTaken: "Dieser Name ist bereits vergeben.",
  handleInvalid: "3-20 Zeichen, nur a-z, 0-9 und _",
  handleAvailable: "Verfügbar!",
  handleChecking: "Handle wird geprüft...",
  handleTakenShort: "Handle ist vergeben — wähle einen anderen.",
  displayNameLabel: "Anzeigename (optional)",
  displayNamePlaceholder: "Dein Name",
  pwSetHint: "Setze ein Passwort, damit du dich beim nächsten Mal mit E-Mail + Passwort anmelden kannst.",
  passwordLabel: "Passwort",
  pwPlaceholder: "Min. 6 Zeichen",
  pwShowLabel: "Passwort anzeigen",
  pwConfirmLabel: "Passwort bestätigen",
  pwConfirmPlaceholder: "Passwort wiederholen",
  pwMinLength: "Passwort muss mindestens 6 Zeichen lang sein.",
  pwMismatch: "Passwörter stimmen nicht überein.",
  pwMinShort: "Passwort: min. 6 Zeichen.",
  pwSetError: "Passwort konnte nicht gesetzt werden: {error}",
  profileCreateError: "Profil konnte nicht erstellt werden.",
  avatarTooLarge: "Bild darf maximal 2MB groß sein.",
  next: "Weiter",
  back: "Zurück",
  // Step 2
  profilePicAndLang: "Profilbild & Sprache",
  uploadHint: "Lade ein Bild hoch und wähle deine Sprache.",
  uploadLabel: "Profilbild hochladen",
  imageSelected: "Bild ausgewählt",
  imageHint: "JPG/PNG, max. 2MB (optional)",
  languageLabel: "Sprache",
  // Step 3
  chooseClub: "Wähle deinen Club",
  chooseClubHint: "Folge mindestens einem Club um loszulegen. Du kannst später weitere hinzufügen.",
  clubSearchPlaceholder: "Club suchen...",
  clubSearchLabel: "Club suchen",
  noClubsFound: "Keine Clubs gefunden.",
  clubsSelected: "{count} Club ausgewählt",
  clubsSelectedPlural: "{count} Clubs ausgewählt",
  letsGo: "Los geht's",
  invitedBy: "Eingeladen von",
  // Callback
  loginFailed: "Anmeldung fehlgeschlagen",
  loginExpired: "Der Link ist ungültig oder abgelaufen.",
  backToLogin: "Zurück zum Login",
  loginProcessing: "Anmeldung wird verarbeitet...",
  loginSlow: "Dauert länger als erwartet...",
};
const authExtTr = {
  createProfile: "Menajer profilini oluştur",
  yourProfile: "Profilin",
  chooseHandle: "BeScout için benzersiz kullanıcı adını seç.",
  chooseHandleAndPw: "Kullanıcı adı seç ve gelecek girişler için şifre belirle.",
  handleLabel: "Kullanıcı adı",
  handlePlaceholder: "kullanici_adi",
  handleTaken: "Bu isim zaten alınmış.",
  handleInvalid: "3-20 karakter, sadece a-z, 0-9 ve _",
  handleAvailable: "Kullanılabilir!",
  handleChecking: "Kullanıcı adı kontrol ediliyor...",
  handleTakenShort: "Kullanıcı adı alınmış — başka bir tane seç.",
  displayNameLabel: "Görünen ad (isteğe bağlı)",
  displayNamePlaceholder: "Adın",
  pwSetHint: "Bir sonraki girişte e-posta + şifre ile giriş yapabilmen için bir şifre belirle.",
  passwordLabel: "Şifre",
  pwPlaceholder: "Min. 6 karakter",
  pwShowLabel: "Şifreyi göster",
  pwConfirmLabel: "Şifreyi onayla",
  pwConfirmPlaceholder: "Şifreyi tekrarla",
  pwMinLength: "Şifre en az 6 karakter olmalıdır.",
  pwMismatch: "Şifreler uyuşmuyor.",
  pwMinShort: "Şifre: min. 6 karakter.",
  pwSetError: "Şifre ayarlanamadı: {error}",
  profileCreateError: "Profil oluşturulamadı.",
  avatarTooLarge: "Resim en fazla 2MB olabilir.",
  next: "İleri",
  back: "Geri",
  profilePicAndLang: "Profil Fotoğrafı & Dil",
  uploadHint: "Bir fotoğraf yükle ve dilini seç.",
  uploadLabel: "Profil fotoğrafı yükle",
  imageSelected: "Resim seçildi",
  imageHint: "JPG/PNG, maks. 2MB (isteğe bağlı)",
  languageLabel: "Dil",
  chooseClub: "Kulübünü Seç",
  chooseClubHint: "Başlamak için en az bir kulüp takip et. Daha sonra ekleyebilirsin.",
  clubSearchPlaceholder: "Kulüp ara...",
  clubSearchLabel: "Kulüp ara",
  noClubsFound: "Kulüp bulunamadı.",
  clubsSelected: "{count} kulüp seçildi",
  clubsSelectedPlural: "{count} kulüp seçildi",
  letsGo: "Haydi başlayalım",
  invitedBy: "Davet eden",
  loginFailed: "Giriş başarısız",
  loginExpired: "Link geçersiz veya süresi dolmuş.",
  backToLogin: "Girişe dön",
  loginProcessing: "Giriş işleniyor...",
  loginSlow: "Beklenenden uzun sürüyor...",
};

// ── clubs (new namespace) — clubs discovery page ──
const clubsDe = {
  discoverTitle: "Clubs entdecken",
  discoverDesc: "Folge Clubs um ihre Spieler zu traden, an Events teilzunehmen und in der Community mitzureden.",
  searchPlaceholder: "Club, Stadt oder Liga suchen...",
  noClubsSearch: "Keine Clubs für \"{query}\" gefunden",
  noClubsAvailable: "Keine Clubs verfügbar",
  resetSearch: "Suche zurücksetzen",
  verified: "Verifiziert",
  fans: "Fans",
  players: "Spieler",
  unfollow: "Entfolgen",
  follow: "Folgen",
  activate: "Aktivieren",
  setActiveTitle: "Als aktiven Club setzen",
  other: "Sonstige",
};
const clubsTr = {
  discoverTitle: "Kulüpleri Keşfet",
  discoverDesc: "Kulüpleri takip ederek oyuncularını trade et, etkinliklere katıl ve toplulukta söz sahibi ol.",
  searchPlaceholder: "Kulüp, şehir veya lig ara...",
  noClubsSearch: "\"{query}\" için kulüp bulunamadı",
  noClubsAvailable: "Kulüp mevcut değil",
  resetSearch: "Aramayı sıfırla",
  verified: "Doğrulanmış",
  fans: "Taraftar",
  players: "Oyuncular",
  unfollow: "Takibi bırak",
  follow: "Takip et",
  activate: "Etkinleştir",
  setActiveTitle: "Aktif kulüp olarak ayarla",
  other: "Diğer",
};

// ── airdrop (new namespace) ──
const airdropDe = {
  title: "$SCOUT Airdrop",
  subtitle: "Sammle Punkte und steige im Rang auf",
  participants: "Teilnehmer",
  avgScore: "Avg. Score",
  comingSoon: "Der Airdrop startet bald!",
  collectPoints: "Sammle jetzt Punkte durch Trading, Fantasy und Community-Aktivität",
  yourRank: "Dein Rang",
  score: "Score",
  top100: "Top 100 Rangliste",
  scouts: "Scouts",
  noData: "Noch keine Airdrop-Daten",
  you: "Du",
  howToImprove: "Wie verbessere ich meinen Score?",
  tipRank: "Scout Rang aufbauen",
  tipRankDesc: "Trader, Manager & Analyst Skill-Rating steigern",
  tipMastery: "DPC Mastery leveln",
  tipMasteryDesc: "DPCs halten, im Fantasy einsetzen, Content erstellen",
  tipDaily: "Täglich aktiv sein",
  tipDailyDesc: "Login-Streak, Trades, Missionen",
  tipReferral: "Freunde einladen",
  tipReferralDesc: "Referral-Code teilen (Founding Scout 3x!)",
  tierSilver: "Silber",
};
const airdropTr = {
  title: "$SCOUT Airdrop",
  subtitle: "Puan topla ve sıralamada yüksel",
  participants: "Katılımcı",
  avgScore: "Ort. Puan",
  comingSoon: "Airdrop yakında başlıyor!",
  collectPoints: "Trading, Fantasy ve topluluk aktivitesiyle puan topla",
  yourRank: "Sıralaman",
  score: "Puan",
  top100: "Top 100 Sıralaması",
  scouts: "Scout",
  noData: "Henüz airdrop verisi yok",
  you: "Sen",
  howToImprove: "Puanımı nasıl artırırım?",
  tipRank: "Scout Rütbeni yükselt",
  tipRankDesc: "Trader, Manager & Analyst Skill-Rating'ini artır",
  tipMastery: "DPC Mastery level",
  tipMasteryDesc: "DPC'leri tut, Fantasy'de kullan, içerik oluştur",
  tipDaily: "Günlük aktif ol",
  tipDailyDesc: "Giriş serisi, Trade'ler, Görevler",
  tipReferral: "Arkadaşlarını davet et",
  tipReferralDesc: "Referans kodunu paylaş (Kurucu Scout 3x!)",
  tierSilver: "Gümüş",
};

// ── compare (new namespace) ──
const compareDe = {
  title: "Spieler vergleichen",
  subtitle: "Bis zu 3 Spieler side-by-side",
  shareLink: "Link teilen",
  linkCopied: "Link kopiert!",
  removePlayer: "Spieler entfernen",
  playerSlot: "Spieler {idx}",
  searchPlaceholder: "Spieler suchen...",
  radarTitle: "Radar-Vergleich",
  statsTitle: "Statistik-Vergleich",
  attribute: "Attribut",
  matches: "Spiele",
  goals: "Tore",
  floorPrice: "Floor Preis",
  age: "Alter",
  emptyTitle: "Wähle mindestens 2 Spieler zum Vergleichen",
  emptyDesc: "Suche oben nach Name, Verein oder Position",
};
const compareTr = {
  title: "Oyuncu Karşılaştırma",
  subtitle: "3 oyuncuyu yan yana karşılaştır",
  shareLink: "Linki paylaş",
  linkCopied: "Link kopyalandı!",
  removePlayer: "Oyuncuyu kaldır",
  playerSlot: "Oyuncu {idx}",
  searchPlaceholder: "Oyuncu ara...",
  radarTitle: "Radar Karşılaştırma",
  statsTitle: "İstatistik Karşılaştırma",
  attribute: "Özellik",
  matches: "Maçlar",
  goals: "Goller",
  floorPrice: "Taban Fiyat",
  age: "Yaş",
  emptyTitle: "Karşılaştırmak için en az 2 oyuncu seç",
  emptyDesc: "Yukarıdan isim, kulüp veya pozisyona göre ara",
};

// ── admin (extend) — InviteClubAdminModal + AdminVotesTab ──
const adminExtDe = {
  // InviteClubAdminModal
  inviteTitle: "Club-Admin einladen",
  inviteSubtitle: "Einladung für {club}",
  emailLabel: "E-Mail-Adresse *",
  invalidEmail: "Bitte gib eine gültige E-Mail-Adresse ein.",
  inviteFailed: "Einladung fehlgeschlagen.",
  networkError: "Netzwerkfehler.",
  invited: "{email} eingeladen!",
  invite: "Einladen",
  roleLabel: "Rolle *",
  roleOwnerDesc: "Voller Zugang, alle Tabs",
  roleAdminDesc: "Alles außer Einstellungen",
  roleEditorDesc: "Content, Events, Spieler, Moderation",
  inviteInfo: "Der eingeladene Nutzer erhält eine E-Mail mit einem Link zum Passwort-Reset. Falls noch kein Account existiert, wird dieser automatisch erstellt.",
  // AdminVotesTab
  votesTitle: "Abstimmungen",
  votesActive: "aktiv",
  votesEnded: "beendet",
  newVote: "Neue Abstimmung",
  noVotes: "Keine Abstimmungen",
  voteCreated: "Abstimmung erstellt!",
  activeLabel: "Aktiv",
  endedLabel: "Beendet",
  votesCount: "Stimmen",
  votePerVote: "$SCOUT/Stimme",
  questionLabel: "Frage",
  questionPlaceholder: "z.B. Welches Trikot-Design bevorzugt ihr?",
  optionLabel: "Option {idx}",
  addOption: "Option hinzufügen",
  costLabel: "Kosten ($SCOUT)",
  durationLabel: "Laufzeit (Tage)",
  createVote: "Abstimmung erstellen",
};
const adminExtTr = {
  inviteTitle: "Kulüp Admini Davet Et",
  inviteSubtitle: "{club} için davet",
  emailLabel: "E-posta adresi *",
  invalidEmail: "Lütfen geçerli bir e-posta adresi girin.",
  inviteFailed: "Davet başarısız.",
  networkError: "Ağ hatası.",
  invited: "{email} davet edildi!",
  invite: "Davet et",
  roleLabel: "Rol *",
  roleOwnerDesc: "Tam erişim, tüm sekmeler",
  roleAdminDesc: "Ayarlar hariç her şey",
  roleEditorDesc: "İçerik, Etkinlikler, Oyuncular, Moderasyon",
  inviteInfo: "Davet edilen kullanıcı şifre sıfırlama linki içeren bir e-posta alacaktır. Hesap yoksa otomatik oluşturulur.",
  votesTitle: "Oylamalar",
  votesActive: "aktif",
  votesEnded: "bitti",
  newVote: "Yeni Oylama",
  noVotes: "Oylama yok",
  voteCreated: "Oylama oluşturuldu!",
  activeLabel: "Aktif",
  endedLabel: "Bitti",
  votesCount: "Oy",
  votePerVote: "$SCOUT/Oy",
  questionLabel: "Soru",
  questionPlaceholder: "örn. Hangi forma tasarımını tercih edersiniz?",
  optionLabel: "Seçenek {idx}",
  addOption: "Seçenek ekle",
  costLabel: "Maliyet ($SCOUT)",
  durationLabel: "Süre (Gün)",
  createVote: "Oylama oluştur",
};

// ── bescoutAdmin (extend) — BescoutAdminContent ──
const bescoutAdminExtDe = {
  statsLoadError: "Statistiken konnten nicht geladen werden.",
  noIpos: "Keine IPOs gefunden.",
  recentActivity: "Letzte Aktivitäten",
  thTime: "Zeit",
  thAction: "Aktion",
  thCategory: "Kategorie",
  thDetails: "Details",
  rolePrefix: "Rolle",
  tabOverview: "Übersicht",
  tabUsers: "Benutzer",
  tabFees: "Gebühren",
  tabGameweeks: "Spieltage",
  tabSponsors: "Sponsoren",
  labelUsers: "Benutzer",
  labelScoutTotal: "$SCOUT Gesamt",
  labelVolume24h: "24h Volumen",
  labelActiveEvents: "Aktive Events",
  labelPendingOffers: "Offene Angebote",
};
const bescoutAdminExtTr = {
  statsLoadError: "İstatistikler yüklenemedi.",
  noIpos: "IPO bulunamadı.",
  recentActivity: "Son Aktiviteler",
  thTime: "Zaman",
  thAction: "İşlem",
  thCategory: "Kategori",
  thDetails: "Detaylar",
  rolePrefix: "Rol",
  tabOverview: "Genel Bakış",
  tabUsers: "Kullanıcılar",
  tabFees: "Ücretler",
  tabGameweeks: "Haftalar",
  tabSponsors: "Sponsorlar",
  labelUsers: "Kullanıcılar",
  labelScoutTotal: "$SCOUT Toplam",
  labelVolume24h: "24s Hacim",
  labelActiveEvents: "Aktif Etkinlikler",
  labelPendingOffers: "Bekleyen Teklifler",
};

// ── profile (new namespace) — profile not-found ──
const profileDe = {
  notFoundTitle: "Profil nicht gefunden",
  notFoundDesc: "Dieser Scout existiert nicht oder hat sein Profil deaktiviert.",
  toHome: "Zur Startseite",
};
const profileTr = {
  notFoundTitle: "Profil bulunamadı",
  notFoundDesc: "Bu Scout mevcut değil veya profilini devre dışı bırakmış.",
  toHome: "Ana sayfaya git",
};

// ── fantasy (extend) — FantasyContent ──
const fantasyExtDe = {
  eventLoading: "Event wird geladen...",
  unregisterFailed: "Abmeldung fehlgeschlagen: {error}",
  eventCreated: "Event \"{name}\" wurde erstellt!",
};
const fantasyExtTr = {
  eventLoading: "Etkinlik yükleniyor...",
  unregisterFailed: "Kayıt iptal edilemedi: {error}",
  eventCreated: "Etkinlik \"{name}\" oluşturuldu!",
};

// Merge all
Object.assign(de.auth, authExtDe);
Object.assign(tr.auth, authExtTr);
if (!de.clubs) de.clubs = {};
Object.assign(de.clubs, clubsDe);
if (!tr.clubs) tr.clubs = {};
Object.assign(tr.clubs, clubsTr);
if (!de.airdrop) de.airdrop = {};
Object.assign(de.airdrop, airdropDe);
if (!tr.airdrop) tr.airdrop = {};
Object.assign(tr.airdrop, airdropTr);
if (!de.compare) de.compare = {};
Object.assign(de.compare, compareDe);
if (!tr.compare) tr.compare = {};
Object.assign(tr.compare, compareTr);
Object.assign(de.admin, adminExtDe);
Object.assign(tr.admin, adminExtTr);
Object.assign(de.bescoutAdmin, bescoutAdminExtDe);
Object.assign(tr.bescoutAdmin, bescoutAdminExtTr);
if (!de.profile) de.profile = {};
Object.assign(de.profile, profileDe);
if (!tr.profile) tr.profile = {};
Object.assign(tr.profile, profileTr);
Object.assign(de.fantasy, fantasyExtDe);
Object.assign(tr.fantasy, fantasyExtTr);

// Write back
fs.writeFileSync(dePath, JSON.stringify(de, null, 2) + '\n', 'utf8');
fs.writeFileSync(trPath, JSON.stringify(tr, null, 2) + '\n', 'utf8');

const total = Object.keys(authExtDe).length + Object.keys(clubsDe).length +
  Object.keys(airdropDe).length + Object.keys(compareDe).length +
  Object.keys(adminExtDe).length + Object.keys(bescoutAdminExtDe).length +
  Object.keys(profileDe).length + Object.keys(fantasyExtDe).length;
console.log(`Added ${total} DE keys and ${total} TR keys across 8 namespaces`);
