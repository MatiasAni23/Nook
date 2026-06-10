export type DetailNavigationState = {
  from?: string;
};

export function getDetailNavigationState(from: string): DetailNavigationState {
  return { from };
}
