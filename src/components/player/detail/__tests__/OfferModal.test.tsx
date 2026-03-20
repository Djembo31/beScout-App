import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import OfferModal from '../OfferModal';

vi.mock('@/components/ui', () => ({
  Modal: ({ open, children, title, footer }: { open: boolean; children: React.ReactNode; title?: string; footer?: React.ReactNode }) =>
    open ? <div data-testid="modal"><div data-testid="title">{title}</div>{children}{footer}</div> : null,
  Button: ({ children, onClick, disabled }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) => (
    <button onClick={onClick} disabled={!!disabled}>{children}</button>
  ),
}));
vi.mock('@/components/legal/TradingDisclaimer', () => ({
  TradingDisclaimer: () => <div data-testid="disclaimer" />,
}));

const defaultProps = {
  open: true,
  onClose: vi.fn(),
  offerPrice: '',
  offerMessage: '',
  offerLoading: false,
  onPriceChange: vi.fn(),
  onMessageChange: vi.fn(),
  onSubmit: vi.fn(),
};

describe('OfferModal', () => {
  it('renders nothing when closed', () => {
    render(<OfferModal {...defaultProps} open={false} />);
    expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
  });

  it('renders modal when open', () => {
    renderWithProviders(<OfferModal {...defaultProps} />);
    expect(screen.getByTestId('modal')).toBeInTheDocument();
  });

  it('shows price input', () => {
    renderWithProviders(<OfferModal {...defaultProps} />);
    expect(screen.getByLabelText('offer.priceLabel')).toBeInTheDocument();
  });

  it('shows message input', () => {
    renderWithProviders(<OfferModal {...defaultProps} />);
    expect(screen.getByLabelText('offer.messageLabel')).toBeInTheDocument();
  });

  it('disables send button when no price', () => {
    renderWithProviders(<OfferModal {...defaultProps} offerPrice="" />);
    const sendBtn = screen.getByText('offer.send');
    expect(sendBtn).toBeDisabled();
  });

  it('enables send button when price provided', () => {
    renderWithProviders(<OfferModal {...defaultProps} offerPrice="50" />);
    const sendBtn = screen.getByText('offer.send');
    expect(sendBtn).not.toBeDisabled();
  });

  it('shows sending text when loading', () => {
    renderWithProviders(<OfferModal {...defaultProps} offerPrice="50" offerLoading={true} />);
    expect(screen.getByText('offer.sending')).toBeInTheDocument();
  });

  it('calls onSubmit when send clicked', () => {
    const onSubmit = vi.fn();
    renderWithProviders(<OfferModal {...defaultProps} offerPrice="50" onSubmit={onSubmit} />);
    fireEvent.click(screen.getByText('offer.send'));
    expect(onSubmit).toHaveBeenCalled();
  });

  it('shows trading disclaimer', () => {
    renderWithProviders(<OfferModal {...defaultProps} />);
    expect(screen.getByTestId('disclaimer')).toBeInTheDocument();
  });

  it('calls onClose when cancel clicked', () => {
    const onClose = vi.fn();
    renderWithProviders(<OfferModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByText('offer.cancel'));
    expect(onClose).toHaveBeenCalled();
  });
});
