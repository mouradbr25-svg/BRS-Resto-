export function formatDZD(amount: number | undefined | null) {
  if (amount === undefined || amount === null) return '0 DZD';
  return new Intl.NumberFormat('en-US').format(amount) + ' DZD';
}
