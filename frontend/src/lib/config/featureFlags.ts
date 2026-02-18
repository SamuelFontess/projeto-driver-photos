const env = process.env.NEXT_PUBLIC_APP_FLAGS ?? '';

function hasFlag(flag: string): boolean {
  return env.split(',').map((item) => item.trim()).includes(flag);
}

export const featureFlags = {
  redesignV2: !hasFlag('redesign_v2_off'),
};
