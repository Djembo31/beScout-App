import type { DbTransaction, DbTicketTransaction } from '@/types';

/**
 * Exports credit + ticket transactions as a CSV file and triggers a browser download.
 *
 * CSV columns:
 *   Date, Currency, Type, Amount, Balance After, Description, Reference
 *
 * Sorted by date descending. Handles quotes in descriptions (RFC 4180 double-quote escape).
 * No React, no network — pure client-side function.
 */
export function exportTransactionsToCsv(
  transactions: DbTransaction[],
  ticketTransactions: DbTicketTransaction[],
  filename = 'transactions.csv',
): void {
  const header = ['Date', 'Currency', 'Type', 'Amount', 'Balance After', 'Description', 'Reference'];
  const rows: string[][] = [];

  for (const tx of transactions) {
    rows.push([
      tx.created_at,
      'Credits',
      tx.type,
      String(tx.amount),
      String(tx.balance_after),
      tx.description ?? '',
      tx.reference_id ?? '',
    ]);
  }

  for (const tx of ticketTransactions) {
    rows.push([
      tx.created_at,
      'Tickets',
      tx.source,
      String(tx.amount),
      String(tx.balance_after),
      tx.description ?? '',
      tx.reference_id ?? '',
    ]);
  }

  // Sort by ISO date string descending (ISO is lexicographically sortable)
  rows.sort((a, b) => b[0].localeCompare(a[0]));

  // RFC 4180: wrap every cell in quotes, escape embedded quotes as ""
  const escape = (cell: string): string => `"${String(cell).replace(/"/g, '""')}"`;
  const csvLines: string[] = [header.map(escape).join(',')];
  for (const row of rows) {
    csvLines.push(row.map(escape).join(','));
  }
  const csv = csvLines.join('\n');

  // Add UTF-8 BOM so Excel opens TR characters correctly
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
