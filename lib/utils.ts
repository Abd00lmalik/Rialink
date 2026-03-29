export function truncateAddress(
  address: string,
  startChars = 6,
  endChars = 4
): string {
  if (!address) return '';
  if (address.length <= startChars + endChars) return address;
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}

export function maskUsername(username: string): string {
  if (!username || username.length <= 4) return username;
  const middleLength = Math.max(1, username.length - 4);
  return username.slice(0, 2) + '*'.repeat(middleLength) + username.slice(-2);
}

export function generateAvatarColor(address: string): string {
  if (!address) return 'hsl(200, 60%, 45%)';
  const hex = address.replace(/[^0-9a-fA-F]/g, '').slice(0, 6);
  const hue = parseInt(hex.slice(0, 2), 16);
  return `hsl(${hue * 1.4}, 60%, 45%)`;
}

export function formatDate(iso: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatProofHash(hash: string): string {
  if (!hash) return '';
  const clean = hash.replace(/^0x/, '');
  return `0x${clean.slice(0, 4)}...${clean.slice(-4)}`;
}

export function formatTxSignature(sig: string): string {
  if (!sig) return '';
  const clean = sig.replace(/^0x/, '');
  if (clean.length <= 10) return clean;
  return `${clean.slice(0, 4)}...${clean.slice(-4)}`;
}

export function createProofShareCode(hash: string): string {
  if (!hash) return '';
  const clean = hash.replace(/^0x/, '').toLowerCase();
  if (clean.length < 12) return clean.toUpperCase();
  const start = clean.slice(0, 4);
  const middle = clean.slice(28, 32);
  const end = clean.slice(-4);
  return `VM-${start}-${middle}-${end}`.toUpperCase();
}
