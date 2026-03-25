import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import { MobileTableCard } from '../MobileTableCard';

type TestItem = { name: string; value: number };

describe('MobileTableCard', () => {
  const columns = [
    { key: 'name', header: 'Name', render: (item: TestItem) => item.name },
    { key: 'value', header: 'Value', render: (item: TestItem) => String(item.value) },
  ];

  const data: TestItem[] = [
    { name: 'Alice', value: 100 },
    { name: 'Bob', value: 200 },
  ];

  it('shows empty message when data is empty', () => {
    renderWithProviders(
      <MobileTableCard columns={columns} data={[]} keyFn={() => '1'} emptyMessage="Keine Daten" />,
    );
    expect(screen.getByText('Keine Daten')).toBeInTheDocument();
  });

  it('shows default empty message when no emptyMessage prop', () => {
    renderWithProviders(
      <MobileTableCard columns={columns} data={[]} keyFn={() => '1'} />,
    );
    // useTranslations returns key
    expect(screen.getByText('noData')).toBeInTheDocument();
  });

  it('renders table headers', () => {
    renderWithProviders(
      <MobileTableCard columns={columns} data={data} keyFn={(item) => item.name} />,
    );
    // Headers appear in both desktop table and mobile cards
    expect(screen.getAllByText('Name').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Value').length).toBeGreaterThanOrEqual(1);
  });

  it('renders data rows', () => {
    renderWithProviders(
      <MobileTableCard columns={columns} data={data} keyFn={(item) => item.name} />,
    );
    // Data appears in both desktop table and mobile cards
    expect(screen.getAllByText('Alice').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Bob').length).toBeGreaterThanOrEqual(1);
  });

  it('uses custom renderCard when provided', () => {
    renderWithProviders(
      <MobileTableCard
        columns={columns}
        data={data}
        keyFn={(item) => item.name}
        renderCard={(item) => <div data-testid="custom-card">{item.name} custom</div>}
      />,
    );
    expect(screen.getAllByTestId('custom-card').length).toBeGreaterThanOrEqual(1);
  });
});
