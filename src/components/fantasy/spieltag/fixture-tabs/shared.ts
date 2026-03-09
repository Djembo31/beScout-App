import type { Fixture, FixturePlayerStat, FixtureSubstitution, Pos } from '@/types';
import type { ClubLookup } from '@/lib/clubs';

/** Shared props for tab panels that receive the full fixture context */
export interface FixtureTabSharedProps {
  stats: FixturePlayerStat[];
  homeStats: FixturePlayerStat[];
  awayStats: FixturePlayerStat[];
  substitutions: FixtureSubstitution[];
  fixture: Fixture;
  mvpId: string | null;
  floorPrices: Map<string, number>;
  homeClub: ClubLookup | null;
  awayClub: ClubLookup | null;
  homeColor: string;
  awayColor: string;
}

/** Extra props only needed by the Formation tab */
export interface FormationTabExtraProps {
  sponsorName?: string;
  sponsorLogo?: string;
}

export type { Fixture, FixturePlayerStat, FixtureSubstitution, Pos, ClubLookup };
