/**
 * Client-side enrichment for a free-text bucket-list goal. Turns a raw
 * phrase ("visit japan and watch a sumo match", "see the northern lights")
 * into a leading emoji + up to three category tags so the bucket list
 * reads as aspirational cards instead of identical plain rows.
 *
 * This is a deliberately cheap, dependency-free keyword heuristic — no
 * backend call, no token cost, no migration. It runs on the goal text the
 * user already typed. A future server-side AI enrichment (rewriting the
 * title + writing a one-line description) can layer on top without changing
 * this contract; until then this carries the visual richness on its own.
 *
 * Matching is order-sensitive: more specific categories are listed first so
 * "sumo match" reads as Sports before a generic City/Destination fallback,
 * and the FIRST matched category supplies the emoji.
 */

export interface BucketGoalEnrichment {
    /** Single leading emoji for the card avatar. */
    emoji: string;
    /** Up to three human category labels, e.g. ['Sports', 'Foodie', 'City']. */
    tags: string[];
}

interface Category {
    label: string;
    emoji: string;
    /** Lowercased substrings; a match on ANY adds this category. */
    keywords: string[];
}

// Ordered most-specific → most-generic. The emoji comes from the first hit,
// so put the categories that should "win" the avatar near the top.
const CATEGORIES: Category[] = [
    {
        label: 'Aurora',
        emoji: '🌌',
        keywords: ['northern light', 'aurora', 'midnight sun', 'polar night'],
    },
    {
        label: 'Hot air balloon',
        emoji: '🎈',
        keywords: ['hot air balloon', 'hot air ballon', 'balloon', 'ballon', 'cappadocia'],
    },
    {
        label: 'Sports',
        emoji: '⚽',
        keywords: [
            'sumo', 'fc ', 'football', 'soccer', 'stadium', 'camp nou', 'nba',
            'basketball', 'baseball', 'nfl', 'super bowl', 'olympic', 'tennis',
            'wimbledon', 'golf', 'grand prix', 'formula 1', 'formula one', 'f1 ',
            'marathon', 'boxing', 'ufc', 'cricket', 'rugby', 'derby match',
            'world cup', 'el clasico', 'el clásico',
        ],
    },
    {
        label: 'Wildlife',
        emoji: '🦁',
        keywords: [
            'safari', 'wildlife', 'serengeti', 'gorilla', 'whale', 'penguin',
            'big five', 'big 5', 'jungle', 'rainforest', 'national park',
        ],
    },
    {
        label: 'Ski',
        emoji: '🎿',
        keywords: ['ski', 'snowboard', 'slopes', 'apres-ski', 'après-ski', 'powder snow'],
    },
    {
        label: 'Hiking',
        emoji: '🥾',
        keywords: [
            'hike', 'hiking', 'trek', 'mountain', 'summit', 'machu picchu',
            'everest', 'kilimanjaro', 'patagonia', 'trail', 'camino', 'climb',
        ],
    },
    {
        label: 'Diving',
        emoji: '🤿',
        keywords: ['scuba', 'snorkel', 'dive', 'reef', 'shipwreck'],
    },
    {
        label: 'Beach',
        emoji: '🏖',
        keywords: [
            'beach', 'island', 'maldives', 'bora bora', 'fiji', 'bali',
            'caribbean', 'coast', 'lagoon', 'overwater', 'tropical', 'seychelles',
        ],
    },
    {
        label: 'Foodie',
        emoji: '🍴',
        keywords: [
            'eat ', 'food', 'sushi', 'restaurant', 'michelin', 'tasting', 'wine',
            'vineyard', 'cuisine', 'dinner', 'street food', 'cooking', 'ramen',
            'dim sum', 'tapas', 'bbq', 'brewery', 'beer ', 'cheese', 'chocolate',
            'coffee', 'pasta', 'pizza',
        ],
    },
    {
        label: 'Festival',
        emoji: '🎉',
        keywords: [
            'festival', 'carnival', 'oktoberfest', 'mardi gras', 'concert',
            'parade', 'fireworks', 'new year', 'diwali', 'holi',
        ],
    },
    {
        label: 'Nightlife',
        emoji: '🌃',
        keywords: ['nightlife', 'nightclub', 'club ', 'party', 'bar crawl', 'rave'],
    },
    {
        label: 'Culture',
        emoji: '🏛',
        keywords: [
            'temple', 'museum', 'ruins', 'castle', 'palace', 'pyramid',
            'colosseum', 'coliseum', 'heritage', 'ancient', 'cathedral',
            'shrine', 'monastery', 'old town',
        ],
    },
    {
        label: 'Wellness',
        emoji: '🧘',
        keywords: ['spa', 'wellness', 'retreat', 'yoga', 'hot spring', 'onsen', 'thermal'],
    },
    {
        label: 'Romantic',
        emoji: '💕',
        keywords: ['honeymoon', 'romantic', 'anniversary', 'propose', 'proposal'],
    },
    {
        label: 'Desert',
        emoji: '🏜',
        keywords: ['desert', 'sahara', 'sand dune', 'dunes'],
    },
    {
        label: 'Road trip',
        emoji: '🚗',
        keywords: ['road trip', 'route 66', 'self drive', 'self-drive'],
    },
    {
        label: 'Cruise',
        emoji: '🛳',
        keywords: ['cruise', 'yacht', 'sail '],
    },
    {
        label: 'Adventure',
        emoji: '🪂',
        keywords: [
            'skydive', 'bungee', 'paraglide', 'zipline', 'rafting', 'adventure',
            'kayak',
        ],
    },
    {
        label: 'City',
        emoji: '🏙',
        keywords: ['city', 'skyline', 'downtown', 'rooftop', 'metropolis'],
    },
];

const DEFAULT_EMOJI = '✈️';
const DEFAULT_TAG = 'Destination';
const MAX_TAGS = 3;

export const enrichBucketGoal = (text: string): BucketGoalEnrichment => {
    // Pad with spaces so word-boundary-ish keywords like 'fc ' / 'eat '
    // can match at the start of the string too.
    const haystack = ` ${text.toLowerCase()} `;
    const tags: string[] = [];
    let emoji = '';

    for (const cat of CATEGORIES) {
        if (cat.keywords.some((kw) => haystack.includes(kw))) {
            if (!emoji) emoji = cat.emoji;
            tags.push(cat.label);
            if (tags.length >= MAX_TAGS) break;
        }
    }

    if (tags.length === 0) {
        // A plain destination ("visit norway") with no themed keyword. Give
        // it the travel default rather than leaving the card bare.
        return { emoji: DEFAULT_EMOJI, tags: [DEFAULT_TAG] };
    }

    return { emoji: emoji || DEFAULT_EMOJI, tags };
};
