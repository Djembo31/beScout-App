export const TFF_CLUBS = [
  { id: 'sakaryaspor', name: 'Sakaryaspor', short: 'SAK', colors: { primary: '#1B5E20', secondary: '#000000' }, logo: '/clubs/sakaryaspor.png' },
  { id: 'goztepe', name: 'Göztepe', short: 'GÖZ', colors: { primary: '#FFD700', secondary: '#DC2626' }, logo: null },
  { id: 'ankaragucu', name: 'Ankaragücü', short: 'ANK', colors: { primary: '#1E3A5F', secondary: '#FFD700' }, logo: null },
  { id: 'umraniyespor', name: 'Ümraniyespor', short: 'ÜMR', colors: { primary: '#DC2626', secondary: '#FFFFFF' }, logo: null },
  { id: 'bandirmaspor', name: 'Bandırmaspor', short: 'BAN', colors: { primary: '#DC2626', secondary: '#FFFFFF' }, logo: null },
  { id: 'boluspor', name: 'Boluspor', short: 'BOL', colors: { primary: '#DC2626', secondary: '#FFFFFF' }, logo: null },
  { id: 'keciörengücü', name: 'Keçiörengücü', short: 'KEÇ', colors: { primary: '#7C3AED', secondary: '#FFFFFF' }, logo: null },
  { id: 'genclerbirligi', name: 'Gençlerbirliği', short: 'GEN', colors: { primary: '#DC2626', secondary: '#000000' }, logo: null },
  { id: 'tuzlaspor', name: 'Tuzlaspor', short: 'TUZ', colors: { primary: '#1E40AF', secondary: '#FFFFFF' }, logo: null },
  { id: 'sanliurfaspor', name: 'Şanlıurfaspor', short: 'ŞAN', colors: { primary: '#16A34A', secondary: '#FFFFFF' }, logo: null },
  { id: 'manisa', name: 'Manisa FK', short: 'MAN', colors: { primary: '#000000', secondary: '#FFFFFF' }, logo: null },
  { id: 'adanaspor', name: 'Adanaspor', short: 'ADA', colors: { primary: '#F97316', secondary: '#1E3A5F' }, logo: null },
  { id: 'altay', name: 'Altay SK', short: 'ALT', colors: { primary: '#000000', secondary: '#FFFFFF' }, logo: null },
  { id: 'erzurumspor', name: 'Erzurumspor FK', short: 'ERZ', colors: { primary: '#1E40AF', secondary: '#FFFFFF' }, logo: null },
  { id: 'istaciospor', name: 'İstanbulspor', short: 'İST', colors: { primary: '#000000', secondary: '#FFD700' }, logo: null },
  { id: 'altinordu', name: 'Altınordu FK', short: 'AOR', colors: { primary: '#DC2626', secondary: '#1E3A5F' }, logo: null },
  { id: 'yeni-malatyaspor', name: 'Yeni Malatyaspor', short: 'MAL', colors: { primary: '#FFD700', secondary: '#000000' }, logo: null },
  { id: 'kocaelispor', name: 'Kocaelispor', short: 'KOC', colors: { primary: '#16A34A', secondary: '#000000' }, logo: null },
  { id: 'pendikspor', name: 'Pendikspor', short: 'PEN', colors: { primary: '#1E40AF', secondary: '#FFFFFF' }, logo: null },
  { id: 'rizespor', name: 'Çaykur Rizespor', short: 'RIZ', colors: { primary: '#16A34A', secondary: '#1E3A5F' }, logo: null },
] as const;

export type ClubId = (typeof TFF_CLUBS)[number]['id'];

export function getClubName(id: string): string {
  return TFF_CLUBS.find((c) => c.id === id)?.name ?? id;
}

export function getClub(idOrName: string) {
  return TFF_CLUBS.find((c) => c.id === idOrName || c.name === idOrName) ?? null;
}
