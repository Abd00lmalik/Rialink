export interface WalletProofPayload {
  wallet: string;
  nonce: string;
  message: string;
  signature: string;
  issuedAt: string;
}

export function buildWalletProofMessage(args: {
  wallet: string;
  nonce: string;
  issuedAt: string;
  domain: string;
}) {
  const { wallet, nonce, issuedAt, domain } = args;
  return [
    "Rialink Wallet Ownership Proof",
    "",
    `Wallet: ${wallet}`,
    `Nonce: ${nonce}`,
    `Issued At: ${issuedAt}`,
    `Domain: ${domain}`,
  ].join("\n");
}


