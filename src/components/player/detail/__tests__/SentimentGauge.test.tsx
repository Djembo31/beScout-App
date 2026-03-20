import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import SentimentGauge from '../SentimentGauge';

describe('SentimentGauge', () => {
  it('shows buy and sell counts', () => {
    renderWithProviders(<SentimentGauge buyCount={30} sellCount={10} />);
    expect(screen.getByText('30')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('shows Bullish label when buy ratio >= 70%', () => {
    renderWithProviders(<SentimentGauge buyCount={80} sellCount={20} />);
    expect(screen.getByText('Bullish')).toBeInTheDocument();
    expect(screen.getByText('80%')).toBeInTheDocument();
  });

  it('shows Neutral label when ratio 40-69%', () => {
    renderWithProviders(<SentimentGauge buyCount={50} sellCount={50} />);
    expect(screen.getByText('Neutral')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('shows Bearish label when ratio < 40%', () => {
    renderWithProviders(<SentimentGauge buyCount={10} sellCount={90} />);
    expect(screen.getByText('Bearish')).toBeInTheDocument();
    expect(screen.getByText('10%')).toBeInTheDocument();
  });

  it('defaults to 50% when no trades', () => {
    renderWithProviders(<SentimentGauge buyCount={0} sellCount={0} />);
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getByText('Neutral')).toBeInTheDocument();
  });

  it('has SVG with aria-label', () => {
    renderWithProviders(<SentimentGauge buyCount={70} sellCount={30} />);
    const svg = screen.getByRole('img');
    expect(svg).toBeInTheDocument();
  });

  it('shows buy/sell labels', () => {
    renderWithProviders(<SentimentGauge buyCount={5} sellCount={3} />);
    expect(screen.getByText('buysSentiment')).toBeInTheDocument();
    expect(screen.getByText('sellsSentiment')).toBeInTheDocument();
  });
});
