import { describe, it, expect } from 'vitest';
import { normalizeForMatch } from './footballApi';

describe('normalizeForMatch', () => {
  it('Turkish specials (standalone, no NFD)', () => {
    expect(normalizeForMatch('Şahin')).toBe('sahin');
    expect(normalizeForMatch('Çağrı')).toBe('cagri');
    expect(normalizeForMatch('İsmet')).toBe('ismet');
    expect(normalizeForMatch('Gülay')).toBe('gulay');
    expect(normalizeForMatch('Barış Alper')).toBe('baris alper');
    expect(normalizeForMatch('Özil')).toBe('ozil');
    expect(normalizeForMatch('Güler')).toBe('guler');
  });

  it('Scandinavian specials (ø/æ/ð/þ)', () => {
    expect(normalizeForMatch('Jørgensen')).toBe('jorgensen');
    expect(normalizeForMatch('Dæhli')).toBe('daehli');
    expect(normalizeForMatch('Røssing-Lelesiit')).toBe('rossing-lelesiit');
    expect(normalizeForMatch('Øyvind')).toBe('oyvind');
    expect(normalizeForMatch('Guðjón')).toBe('gudjon');
    expect(normalizeForMatch('Þór')).toBe('thor');
  });

  it('Polish Ł', () => {
    expect(normalizeForMatch('Łukasz')).toBe('lukasz');
    expect(normalizeForMatch('Błażej')).toBe('blazej');
    expect(normalizeForMatch('Wojciech')).toBe('wojciech');
  });

  it('German ß', () => {
    expect(normalizeForMatch('Weiß')).toBe('weiss');
    expect(normalizeForMatch('Großkreutz')).toBe('grosskreutz');
    expect(normalizeForMatch('Müller')).toBe('muller');
    expect(normalizeForMatch('Schäfer')).toBe('schafer');
  });

  it('Serbo-Croatian Latin đ', () => {
    expect(normalizeForMatch('Đorđe')).toBe('dorde');
    expect(normalizeForMatch('Đoković')).toBe('dokovic');
    expect(normalizeForMatch('Šešelj')).toBe('seselj');
  });

  it('French/Spanish/Italian accents via NFD', () => {
    expect(normalizeForMatch('Édouard')).toBe('edouard');
    expect(normalizeForMatch('François')).toBe('francois');
    expect(normalizeForMatch('Jesús')).toBe('jesus');
    expect(normalizeForMatch('Muñoz')).toBe('munoz');
    expect(normalizeForMatch('Çonçalves')).toBe('concalves');
  });

  it('lowercases + trims', () => {
    expect(normalizeForMatch('  HAKAN ARSLAN  ')).toBe('hakan arslan');
    expect(normalizeForMatch('MÜLLER')).toBe('muller');
  });

  it('mixed-script real Bundesliga + Welle 1A names', () => {
    expect(normalizeForMatch('Harry Edward Kane')).toBe('harry edward kane');
    expect(normalizeForMatch('Min-Jae Kim')).toBe('min-jae kim');
    expect(normalizeForMatch('Josha Mamadou Karaboue Vagnoman')).toBe('josha mamadou karaboue vagnoman');
  });

  it('idempotent (already-normalized stays same)', () => {
    expect(normalizeForMatch('hakan arslan')).toBe('hakan arslan');
    expect(normalizeForMatch(normalizeForMatch('Şahin'))).toBe('sahin');
  });
});
