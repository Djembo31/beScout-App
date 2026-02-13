import type { Gameweek } from './types';

export const GAMEWEEKS: Gameweek[] = [
  { id: 'gw10', number: 10, label: 'GW10', dateRange: 'Jan 16-19', status: 'past', lockTime: Date.now() - 1209600000 },
  { id: 'gw11', number: 11, label: 'GW11', dateRange: 'Jan 23-26', status: 'past', lockTime: Date.now() - 604800000 },
  { id: 'gw12', number: 12, label: 'GW12', dateRange: 'Jan 30-Feb 2', status: 'past', lockTime: Date.now() - 86400000 },
  { id: 'gw13', number: 13, label: 'GW13', dateRange: 'Feb 6-9', status: 'current', lockTime: Date.now() + 86400000 },
  { id: 'gw14', number: 14, label: 'GW14', dateRange: 'Feb 13-16', status: 'upcoming', lockTime: Date.now() + 691200000 },
  { id: 'gw15', number: 15, label: 'GW15', dateRange: 'Feb 20-23', status: 'upcoming', lockTime: Date.now() + 1296000000 },
];

export const FORMATIONS_6ER = [
  {
    id: '1-2-2-1', name: 'Balanced (1-2-2-1)', slots: [
      { pos: 'GK', count: 1 },
      { pos: 'DEF', count: 2 },
      { pos: 'MID', count: 2 },
      { pos: 'ATT', count: 1 },
    ]
  },
  {
    id: '1-3-1-1', name: 'Defensiv (1-3-1-1)', slots: [
      { pos: 'GK', count: 1 },
      { pos: 'DEF', count: 3 },
      { pos: 'MID', count: 1 },
      { pos: 'ATT', count: 1 },
    ]
  },
  {
    id: '1-1-3-1', name: 'Offensiv (1-1-3-1)', slots: [
      { pos: 'GK', count: 1 },
      { pos: 'DEF', count: 1 },
      { pos: 'MID', count: 3 },
      { pos: 'ATT', count: 1 },
    ]
  },
  {
    id: '1-2-1-2', name: 'Twin Striker (1-2-1-2)', slots: [
      { pos: 'GK', count: 1 },
      { pos: 'DEF', count: 2 },
      { pos: 'MID', count: 1 },
      { pos: 'ATT', count: 2 },
    ]
  },
];

export const PRESET_KEY = 'bescout-lineup-presets';
