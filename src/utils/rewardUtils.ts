/**
 * Helper utilities for item reward resolution and validation.
 * A reward is ONLY valid if the item is of type 'lost' AND the user provided
 * a non-empty reward description or monetary/token amount.
 */

export function getRewardDetails(item: {
  type?: string;
  rewardOffered?: boolean | string | number | null;
  rewardAmount?: string | null;
  reward_amount?: string | null;
  reward_offered?: boolean | string | number | null;
} | null | undefined): string | null {
  if (!item || item.type !== 'lost') return null;

  const sanitize = (val: unknown): string | null => {
    if (typeof val !== 'string') return null;
    const trimmed = val.trim();
    if (
      !trimmed ||
      trimmed === 'false' ||
      trimmed === 'true' ||
      trimmed === 'undefined' ||
      trimmed === 'null' ||
      trimmed === '0' ||
      trimmed === 'NaN'
    ) {
      return null;
    }
    return trimmed;
  };

  // 1. Check explicit rewardAmount / reward_amount first
  const amt = sanitize(item.rewardAmount) || sanitize(item.reward_amount);
  if (amt) return amt;

  // 2. Check rewardOffered / reward_offered if string contains actual text/token
  const offered = sanitize(item.rewardOffered) || sanitize(item.reward_offered);
  if (offered) return offered;

  return null;
}

export function hasItemReward(item: {
  type?: string;
  rewardOffered?: boolean | string | number | null;
  rewardAmount?: string | null;
  reward_amount?: string | null;
  reward_offered?: boolean | string | number | null;
} | null | undefined): boolean {
  return Boolean(getRewardDetails(item));
}
