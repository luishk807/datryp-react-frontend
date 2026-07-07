/**
 * Best-guess review category for a place, from its name alone.
 *
 * Activities carry no stored category (the AI builder + seeding emit every
 * sight, meal, park, and trail as a plain `place`), so — exactly like the
 * timeline's `placeIconFor` — we classify by keyword to pick which chip set an
 * activity review shows. Rules are checked in order; the first match wins,
 * else the generic `universal` set. Kept deliberately parallel to
 * `PLACE_ICON_RULES` in DestinationDetail/Activities so the two stay in sync.
 */
import { REVIEW_CATEGORY } from 'constants';
import type { ReviewCategory } from 'types';

const CATEGORY_RULES: ReadonlyArray<readonly [RegExp, ReviewCategory]> = [
    // Meals + dining venues (before café/bar so "Noodle Bar" → restaurant).
    [
        /^(?:lunch|dinner|brunch|breakfast|supper|snacks?|dine|dining|eat)\b|\b(?:restaurants?|bistros?|brasseries?|trattorias?|osteria|ristorante|eatery|eateries|steakhouses?|diners?|pizzerias?|taqueria|tapas|izakaya|ramen|noodles?|dumplings?|sushi|bbq|barbecue|grill|caf[eé]|coffee|tea\s?house|bars?|pubs?|food\s?(?:court|market|hall)|street\s?food)(?![a-z])/i,
        REVIEW_CATEGORY.RESTAURANT,
    ],
    // Beaches / coast.
    [
        /\b(?:beach(?:es)?|seaside|shore|lagoons?|coves?)(?![a-z])/i,
        REVIEW_CATEGORY.BEACH,
    ],
    // Hiking / trails / mountains.
    [
        /\b(?:hikes?|hiking|trails?|trek(?:king)?|summits?|peaks?|mount(?:ain)?s?|ridges?|canyons?|volcanoe?s?)(?![a-z])/i,
        REVIEW_CATEGORY.HIKE,
    ],
    // Museums / galleries / exhibitions.
    [
        /\b(?:museums?|galleries|gallery|exhibitions?|exhibits?)(?![a-z])/i,
        REVIEW_CATEGORY.MUSEUM,
    ],
    // Classic sights / attractions — parks, temples, castles, towers, markets,
    // theme parks, zoos, aquariums, monuments, landmarks…
    [
        /\b(?:(?:amusement|theme|water)\s?parks?|funfair|zoos?|aquarium|safari|ferris|parks?|gardens?|botanical|arboretum|temples?|shrines?|pagodas?|monaster(?:y|ies)|wat|churches?|cathedrals?|basilicas?|chapels?|abbeys?|mosques?|masjid|castles?|palaces?|forts?|fortress(?:es)?|citadels?|ch[aâ]teau|monuments?|memorials?|mausoleums?|landmarks?|towers?|statues?|obelisks?|markets?|bazaars?|souks?)(?![a-z])/i,
        REVIEW_CATEGORY.ATTRACTION,
    ],
];

export const placeCategoryFor = (name: string): ReviewCategory => {
    const n = (name ?? '').trim();
    for (const [re, category] of CATEGORY_RULES) {
        if (re.test(n)) return category;
    }
    return REVIEW_CATEGORY.UNIVERSAL;
};
