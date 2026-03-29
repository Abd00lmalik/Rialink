import { createHash } from "crypto";
import type { Platform } from "@/lib/types";

const SPEC_PREFIX = "rialink:v1";

function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

export function computeProofHash(args: {
  wallet: string;
  platform: Platform;
  platformUserId: string | number;
}): string {
  const wallet = String(args.wallet).trim();
  const platform = args.platform;
  const platformUserId = String(args.platformUserId).trim();
  return sha256Hex(`${SPEC_PREFIX}|svm|${wallet}|${platform}|${platformUserId}`);
}

export function computeUsernameHash(args: {
  platform: Platform;
  username: string;
}): string {
  const username = String(args.username).trim().toLowerCase();
  return sha256Hex(`${SPEC_PREFIX}|username|${args.platform}|${username}`);
}

