interface SiteCandidate { id: string; site?: string }
interface SiteCheck { site?: { status: string } }

export function selectLiveSites<T extends SiteCandidate>(
  candidates: readonly T[],
  availability: Record<string, SiteCheck | undefined>,
): Array<T & { site: string }> {
  return candidates.filter((candidate): candidate is T & { site: string } =>
    Boolean(candidate.site) && availability[candidate.id]?.site?.status === 'online'
  );
}
