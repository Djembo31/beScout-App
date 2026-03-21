import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import { LegalLayout } from '../LegalLayout';

vi.mock('lucide-react', () => ({
  ArrowLeft: () => null,
}));

describe('LegalLayout', () => {
  it('renders title', () => {
    renderWithProviders(<LegalLayout title="Nutzungsbedingungen"><p>Content</p></LegalLayout>);
    expect(screen.getByText('Nutzungsbedingungen')).toBeInTheDocument();
  });

  it('renders children', () => {
    renderWithProviders(<LegalLayout title="Test"><p>Legal text here</p></LegalLayout>);
    expect(screen.getByText('Legal text here')).toBeInTheDocument();
  });

  it('shows back link', () => {
    renderWithProviders(<LegalLayout title="Test"><p>Content</p></LegalLayout>);
    expect(screen.getByText('backToHome')).toBeInTheDocument();
  });

  it('shows footer links', () => {
    renderWithProviders(<LegalLayout title="Test"><p>Content</p></LegalLayout>);
    expect(screen.getByText('AGB')).toBeInTheDocument();
    expect(screen.getByText('Datenschutz')).toBeInTheDocument();
    expect(screen.getByText('Impressum')).toBeInTheDocument();
  });

  it('shows copyright', () => {
    renderWithProviders(<LegalLayout title="Test"><p>Content</p></LegalLayout>);
    expect(screen.getByText('copyright')).toBeInTheDocument();
  });
});
