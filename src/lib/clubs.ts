export const TFF_CLUBS = [
  { id: 'sakaryaspor', name: 'Sakaryaspor', short: 'SAK', colors: { primary: '#1B5E20', secondary: '#000000' }, logo: '/clubs/sakaryaspor.png', stadiumImage: '/stadiums/sakaryaspor.jpg' },
  { id: 'goztepe', name: 'Göztepe', short: 'GÖZ', colors: { primary: '#FFD700', secondary: '#DC2626' }, logo: '/clubs/goztepe.png', stadiumImage: '/stadiums/goztepe.jpg' },
  { id: 'ankaragucu', name: 'Ankaragücü', short: 'ANK', colors: { primary: '#1E3A5F', secondary: '#FFD700' }, logo: '/clubs/ankaragucu.png', stadiumImage: '/stadiums/ankaragucu.jpg' },
  { id: 'umraniyespor', name: 'Ümraniyespor', short: 'ÜMR', colors: { primary: '#DC2626', secondary: '#FFFFFF' }, logo: '/clubs/umraniyespor.png', stadiumImage: '/stadiums/umraniyespor.jpg' },
  { id: 'bandirmaspor', name: 'Bandırmaspor', short: 'BAN', colors: { primary: '#DC2626', secondary: '#FFFFFF' }, logo: '/clubs/bandirmaspor.png', stadiumImage: '/stadiums/bandirmaspor.jpg' },
  { id: 'boluspor', name: 'Boluspor', short: 'BOL', colors: { primary: '#DC2626', secondary: '#FFFFFF' }, logo: '/clubs/boluspor.png', stadiumImage: '/stadiums/boluspor.jpg' },
  { id: 'keciörengücü', name: 'Keçiörengücü', short: 'KEÇ', colors: { primary: '#7C3AED', secondary: '#FFFFFF' }, logo: '/clubs/keciörengücü.png', stadiumImage: '/stadiums/keciörengücü.jpg' },
  { id: 'genclerbirligi', name: 'Gençlerbirliği', short: 'GEN', colors: { primary: '#DC2626', secondary: '#000000' }, logo: '/clubs/genclerbirligi.png', stadiumImage: '/stadiums/genclerbirligi.jpg' },
  { id: 'tuzlaspor', name: 'Tuzlaspor', short: 'TUZ', colors: { primary: '#1E40AF', secondary: '#FFFFFF' }, logo: '/clubs/tuzlaspor.png', stadiumImage: '/stadiums/tuzlaspor.jpg' },
  { id: 'sanliurfaspor', name: 'Şanlıurfaspor', short: 'ŞAN', colors: { primary: '#16A34A', secondary: '#FFFFFF' }, logo: '/clubs/sanliurfaspor.png', stadiumImage: '/stadiums/sanliurfaspor.jpg' },
  { id: 'manisa', name: 'Manisa FK', short: 'MAN', colors: { primary: '#000000', secondary: '#FFFFFF' }, logo: '/clubs/manisa.png', stadiumImage: '/stadiums/manisa.jpg' },
  { id: 'adanaspor', name: 'Adanaspor', short: 'ADA', colors: { primary: '#F97316', secondary: '#1E3A5F' }, logo: '/clubs/adanaspor.png', stadiumImage: '/stadiums/adanaspor.jpg' },
  { id: 'altay', name: 'Altay SK', short: 'ALT', colors: { primary: '#000000', secondary: '#FFFFFF' }, logo: '/clubs/altay.png', stadiumImage: '/stadiums/altay.jpg' },
  { id: 'erzurumspor', name: 'Erzurumspor FK', short: 'ERZ', colors: { primary: '#1E40AF', secondary: '#FFFFFF' }, logo: '/clubs/erzurumspor.png', stadiumImage: '/stadiums/erzurumspor.jpg' },
  { id: 'istaciospor', name: 'İstanbulspor', short: 'İST', colors: { primary: '#000000', secondary: '#FFD700' }, logo: '/clubs/istaciospor.png', stadiumImage: '/stadiums/istaciospor.jpg' },
  { id: 'altinordu', name: 'Altınordu FK', short: 'AOR', colors: { primary: '#DC2626', secondary: '#1E3A5F' }, logo: '/clubs/altinordu.png', stadiumImage: '/stadiums/altinordu.jpg' },
  { id: 'yeni-malatyaspor', name: 'Yeni Malatyaspor', short: 'MAL', colors: { primary: '#FFD700', secondary: '#000000' }, logo: '/clubs/yeni-malatyaspor.png', stadiumImage: '/stadiums/yeni-malatyaspor.jpg' },
  { id: 'kocaelispor', name: 'Kocaelispor', short: 'KOC', colors: { primary: '#16A34A', secondary: '#000000' }, logo: '/clubs/kocaelispor.png', stadiumImage: '/stadiums/kocaelispor.jpg' },
  { id: 'pendikspor', name: 'Pendikspor', short: 'PEN', colors: { primary: '#1E40AF', secondary: '#FFFFFF' }, logo: '/clubs/pendikspor.png', stadiumImage: '/stadiums/pendikspor.jpg' },
  { id: 'rizespor', name: 'Çaykur Rizespor', short: 'RIZ', colors: { primary: '#16A34A', secondary: '#1E3A5F' }, logo: '/clubs/rizespor.png', stadiumImage: '/stadiums/rizespor.jpg' },
] as const;

export type ClubId = (typeof TFF_CLUBS)[number]['id'];

/** Pilot Club DB UUID (Sakaryaspor) — single source of truth for all hardcoded references */
export const PILOT_CLUB_ID = '2bf30014-db88-4567-9885-9da215e3a0d4';

export function getClubName(id: string): string {
  return TFF_CLUBS.find((c) => c.id === id)?.name ?? id;
}

export function getClub(idOrName: string): {
  id: string;
  name: string;
  short: string;
  colors: { primary: string; secondary: string };
  logo: string | null;
  stadiumImage: string;
} | null {
  return TFF_CLUBS.find((c) => c.id === idOrName || c.name === idOrName) ?? null;
}
