import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import OwnTopMoversStrip from '../OwnTopMoversStrip';

const messages = {
  home: {
    topMoversWeek: 'Top Mover der Woche',
    topMoversWeekEmpty: 'Keine Bewegung',
  },
};

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="de" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe('OwnTopMoversStrip (Slice 269)', () => {
  it('returns null when no holdings', () => {
    const { container } = renderWithIntl(
      <OwnTopMoversStrip topMovers={[]} hasHoldings={false} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders empty-state when holdings exist but no movement', () => {
    renderWithIntl(<OwnTopMoversStrip topMovers={[]} hasHoldings={true} />);
    expect(screen.getByText('Keine Bewegung')).toBeTruthy();
  });

  it('renders movers strip with up + down players', () => {
    const { container } = renderWithIntl(
      <OwnTopMoversStrip
        topMovers={[
          { playerId: 'p-1', player: 'Alice Up', club: 'CA', change24h: 12.5 },
          { playerId: 'p-2', player: 'Bob Down', club: 'CB', change24h: -7.3 },
        ]}
        hasHoldings={true}
      />,
    );
    expect(screen.getByText('Alice Up')).toBeTruthy();
    expect(screen.getByText('Bob Down')).toBeTruthy();
    expect(container.textContent).toContain('+12.5%');
    expect(container.textContent).toContain('-7.3%');
  });
});
