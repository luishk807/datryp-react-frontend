import { type CSSProperties, useEffect, useMemo, useState } from 'react';
import classnames from 'classnames';
import './index.scss';

/**
 * Rotating "while you wait" copy. Used by the city / country / place
 * detail pages where the first-time fetch can take ~30-60s while the
 * backend pulls + caches AI-generated travel info. The card crossfades
 * through a short list of tips so the user has something to read
 * instead of staring at a static "Loading…" line.
 *
 * The facts list is shuffled per mount so reload-mashers don't see the
 * same one every time. `placeName` is interpolated into a couple of
 * the entries to keep the copy feeling location-aware even though most
 * of it is generic travel-trivia.
 */

export interface LoadingFactsProps {
    /** Name of the city / country / place being loaded — woven into a
     *  couple of the facts so the rotation feels specific. */
    placeName: string;
    /** Country name where available — used for country-specific
     *  prompts. Falls back gracefully when omitted. */
    countryName?: string;
    /** Rotation cadence in ms. Default 4500 reads as "long enough to
     *  finish a sentence, short enough to feel alive." */
    intervalMs?: number;
    /** Optional header line shown above the card. */
    headline?: string;
    /** Extra className on the wrapper for surface-specific spacing. */
    className?: string;
}

interface Fact {
    title: string;
    body: string;
}

const GENERIC_FACTS: Fact[] = [
    {
        title: 'Working on it',
        body: 'We are stitching together climate, safety, lodging and on-the-ground tips for you. First visits take a moment — every later visit is instant.',
    },
    {
        title: 'Pack light',
        body: 'Travelers consistently overpack by 30–50%. The unspoken rule: lay out everything, then take half. Your back will thank you.',
    },
    {
        title: 'Carry a copy',
        body: 'Snap a photo of your passport, IDs, and bookings. Store them somewhere you can reach without internet — getting locked out of a cloud account abroad is a story you do not want.',
    },
    {
        title: 'Local breakfast wins',
        body: 'Skip the hotel buffet at least once. The neighborhood place around the corner usually has cheaper, better, and more honest food.',
    },
    {
        title: 'Two ATM cards',
        body: 'One travels with you, one stays locked away in your room. If a card gets eaten by a machine on a Sunday, you still have rent money.',
    },
    {
        title: 'Two-hour rule',
        body: 'Plan no more than two big things per day. The rest is for wandering, getting lost, and the unplanned moment that will become the trip story.',
    },
    {
        title: 'Offline maps',
        body: 'Download the city map offline before you go. Roaming is patchy, batteries die, and a paper backup of your hotel address has saved more travelers than they will admit.',
    },
    {
        title: 'Tip the kind',
        body: 'Tipping etiquette differs wildly — round up in cash where customary, never insult where it is not. A quick search saves an awkward moment.',
    },
    {
        title: 'Walk before you ride',
        body: 'The first morning on foot tells you more about a place than three days in taxis. Stretch the legs, get the lay of the land.',
    },
    {
        title: 'Eat where locals queue',
        body: 'If the line is full of people heading home from work, you have found dinner. If the menu has photos and six languages, keep walking.',
    },
    {
        title: 'Three currencies',
        body: 'Carry a small amount of local cash, a working card, and a backup. Small markets, taxis, and tips often refuse cards in places you would never expect.',
    },
    {
        title: 'Power up',
        body: 'A universal adapter weighs almost nothing and saves the first morning of every trip. Voltage matters — check it before plugging in a hair dryer.',
    },
    {
        title: 'Water rules',
        body: 'Tap-water safe? Bottled only? Filtered fine? Knowing this for your destination is the cheapest way to avoid the kind of stomach trouble that ruins a trip.',
    },
    {
        title: 'Slow morning, late night',
        body: 'In most cultures, mornings move slowly and nights stretch long. Adjust your schedule to the rhythm of the place and you will see more.',
    },
    {
        title: 'Learn five words',
        body: 'Hello, thank you, yes, no, and the local "excuse me" go further than any phrasebook. Locals notice the effort.',
    },
    {
        title: 'The 24-hour rule',
        body: 'Jet lag hits hardest the day AFTER you arrive. Plan a soft first day — markets, slow walks, a quiet meal — and save the big sights for day two.',
    },
    {
        title: 'Photograph the receipt',
        body: 'Snap a quick photo of every restaurant or shop receipt before you toss it. Helps with expense splits and is a tiny memory keeper of where you ate.',
    },
];

const countrySpecificFact = (countryName?: string): Fact | null => {
    if (!countryName) return null;
    return {
        title: `Heading to ${countryName}?`,
        body: `Every country has its quirks — visa rules, sim cards, tipping, the time the metro stops running. Once this page loads, the basics for ${countryName} are all in one spot.`,
    };
};

const placeSpecificFact = (placeName?: string): Fact | null => {
    if (!placeName) return null;
    return {
        title: 'Almost there',
        body: `Pulling together travel info for ${placeName}. The first visit is the slow one — after this it is cached for you and everyone else.`,
    };
};

// Fisher-Yates so the order changes each mount without re-rendering
// the same first card on every reload.
const shuffle = <T,>(input: T[]): T[] => {
    const out = input.slice();
    for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
};

const LoadingFacts = ({
    placeName,
    countryName,
    intervalMs = 4500,
    headline,
    className,
}: LoadingFactsProps) => {
    const facts = useMemo<Fact[]>(() => {
        const list: Fact[] = [];
        const placeFact = placeSpecificFact(placeName);
        if (placeFact) list.push(placeFact);
        const countryFact = countrySpecificFact(countryName);
        if (countryFact) list.push(countryFact);
        list.push(...shuffle(GENERIC_FACTS));
        return list;
    }, [placeName, countryName]);

    const [idx, setIdx] = useState(0);

    useEffect(() => {
        if (facts.length <= 1) return;
        const handle = window.setInterval(() => {
            setIdx((i) => (i + 1) % facts.length);
        }, intervalMs);
        return () => window.clearInterval(handle);
    }, [facts.length, intervalMs]);

    const fact = facts[idx];
    if (!fact) return null;

    return (
        <div className={classnames('loading-facts', className)}>
            {headline && (
                <p className="loading-facts-headline">{headline}</p>
            )}
            <div
                className="loading-facts-card"
                role="status"
                aria-live="polite"
                key={idx}
            >
                <p className="loading-facts-title">{fact.title}</p>
                <p className="loading-facts-body">{fact.body}</p>
            </div>
            <div
                className="loading-facts-progress"
                aria-hidden="true"
                // CSS variable consumed by the ::after animation, so the
                // sweep duration matches the JS rotation cadence. Cast
                // through unknown — `--cycle` is not in CSSProperties.
                style={
                    {
                        ['--loading-facts-cycle' as string]: `${intervalMs}ms`,
                    } as CSSProperties
                }
                key={idx}
            />
        </div>
    );
};

export default LoadingFacts;
