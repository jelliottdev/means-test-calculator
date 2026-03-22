export function looksLikeImplicitTransportStop(text: string): boolean {
  return /ownership|public transportation|regional|standard allowance|operating cost/i.test(text);
}

export function looksLikeImplicitHousingStop(text: string): boolean {
  return /statewide|state default|standard allowance|mortgage|non-mortgage|utility|housing allowance/i.test(text);
}
