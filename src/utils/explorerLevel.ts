export type ExplorerLevelKey =
    | 'worldCitizen'
    | 'globeTrekker'
    | 'worldExplorer'
    | 'frequentTraveler'
    | 'beginnerExplorer'
    | 'newExplorer';

export interface ExplorerLevel {
    emoji: string;
    levelKey: ExplorerLevelKey;
}

/**
 * Map a visited-country count to a playful, *honest* explorer tier.
 * Deliberately NOT a "you've traveled more than X% of people" claim — we have
 * no real population distribution to back that up. Levels are self-referential
 * (your own count), so they motivate without lying. The `levelKey` maps to the
 * shared `atlas.level.<key>` i18n strings used by both the Atlas page and the
 * My Trips Atlas summary card.
 */
export const explorerLevel = (n: number): ExplorerLevel => {
    if (n >= 61) return { emoji: '🏆', levelKey: 'worldCitizen' };
    if (n >= 31) return { emoji: '✈️', levelKey: 'globeTrekker' };
    if (n >= 16) return { emoji: '🌍', levelKey: 'worldExplorer' };
    if (n >= 6) return { emoji: '🧳', levelKey: 'frequentTraveler' };
    if (n >= 1) return { emoji: '🌱', levelKey: 'beginnerExplorer' };
    return { emoji: '🧭', levelKey: 'newExplorer' };
};
