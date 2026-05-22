import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import Layout from 'components/common/Layout/SubLayout';
import PlanCards from 'components/PlanCards';
import './index.scss';

/**
 * Plans + pricing page. Pure marketing: comparison table, value-prop
 * bullets, FAQ. The PlanCards component handles the actual "Start trial"
 * CTA — same flow as the paywall modal, just in a fuller context.
 *
 * The route is intentionally NOT gated. Logged-out visitors should be able
 * to read the pricing before signing up; the PlanCards CTA prompts login
 * when needed (Stripe Checkout requires an authenticated user via the API).
 */

interface FeatureRow {
    label: string;
    free: string | boolean;
    pro: string | boolean;
    /** Optional one-line clarification shown beneath the label in lighter text. */
    note?: string;
}

const FEATURE_ROWS: FeatureRow[] = [
    {
        label: 'Saved trips',
        free: '1',
        pro: 'Unlimited',
        note: 'Past, present, and future — all in one place.',
    },
    {
        label: 'AI search depth',
        free: '2 places per search',
        pro: '5 places per search',
    },
    {
        label: 'AI search model',
        free: 'Standard',
        pro: 'Advanced AI Search',
        note: 'Richer recommendations, deeper detail for each place.',
    },
    {
        label: 'Daily AI search limit',
        free: '5 / day',
        pro: 'Unlimited',
    },
    {
        label: 'Bucket list',
        free: '10 entries',
        pro: 'Unlimited',
        note: 'Save the places you dream about and come back when you’re ready.',
    },
    {
        label: 'Turn a bucket-list goal into a trip',
        free: false,
        pro: true,
        note: 'One click → AI builds a full itinerary (country, days, activities) you can edit and save.',
    },
    {
        label: 'Personalized "Places you might love"',
        free: true,
        pro: true,
        note: 'Picks tied to your interests, travel style, and dream destinations.',
    },
    {
        label: 'Trip collaboration with friends',
        free: true,
        pro: true,
    },
    {
        label: 'Country & city detail pages',
        free: true,
        pro: true,
    },
    {
        label: 'Saved & visited places',
        free: true,
        pro: true,
    },
    {
        label: 'Free trial',
        free: '—',
        pro: '30 days, cancel anytime',
    },
];

const renderCell = (value: string | boolean) => {
    if (value === true) {
        return (
            <CheckRoundedIcon
                className="membership-icon membership-icon--check"
                aria-label="Included"
            />
        );
    }
    if (value === false) {
        return (
            <CloseRoundedIcon
                className="membership-icon membership-icon--cross"
                aria-label="Not included"
            />
        );
    }
    return <span>{value}</span>;
};

const Membership = () => (
    <Layout title="Plans & Pricing">
        <article className="membership-page">
            <header className="membership-hero">
                <h1 className="membership-hero-title">
                    Plan smarter. Plan more.
                </h1>
                <p className="membership-hero-subtitle">
                    Free works for casual trips. Pro is for travelers who want
                    deeper recommendations, unlimited saved itineraries, and a
                    bucket list that builds the trip for them. Try Pro free for
                    30 days — no charge until day 31, cancel anytime.
                </p>
            </header>

            <section className="membership-plans">
                <PlanCards />
            </section>

            <section className="membership-table-section">
                <h2 className="membership-section-title">What&rsquo;s included</h2>
                <div className="membership-table-scroll">
                    <table className="membership-table">
                        <thead>
                            <tr>
                                <th className="membership-table-feature">Feature</th>
                                <th>Free</th>
                                <th>
                                    Pro
                                    <span className="membership-table-pro-tag">
                                        $3.99/mo or $29/yr
                                    </span>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {FEATURE_ROWS.map((row) => (
                                <tr key={row.label}>
                                    <td className="membership-table-feature">
                                        <div className="membership-table-feature-label">
                                            {row.label}
                                        </div>
                                        {row.note && (
                                            <div className="membership-table-feature-note">
                                                {row.note}
                                            </div>
                                        )}
                                    </td>
                                    <td>{renderCell(row.free)}</td>
                                    <td className="membership-table-pro-cell">
                                        {renderCell(row.pro)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            <section className="membership-why">
                <h2 className="membership-section-title">Why upgrade?</h2>
                <ul className="membership-why-list">
                    <li>
                        <strong>Unlimited saved trips.</strong> Free is capped
                        at one — Pro lets you keep every itinerary you build,
                        past and future.
                    </li>
                    <li>
                        <strong>Advanced AI Search.</strong> Pro uses a
                        deeper model and returns 5 places per query with
                        richer detail. Free is a taste; Pro is the full menu.
                    </li>
                    <li>
                        <strong>No daily limits.</strong> Free is 5 AI
                        searches a day. Pro doesn&rsquo;t count.
                    </li>
                    <li>
                        <strong>Bucket list, unlocked.</strong> Free keeps the
                        first 10 entries; Pro is unlimited. Tap{' '}
                        <em>Create trip</em> on any entry and Pro&rsquo;s AI
                        turns the goal into a planned itinerary, ready to
                        edit and save.
                    </li>
                    <li>
                        <strong>Try before you commit.</strong> 30-day free
                        trial, card upfront so the rollover is automatic if
                        you love it. Cancel any time in the billing portal —
                        no charge until day 31.
                    </li>
                </ul>
            </section>

            <section className="membership-faq">
                <h2 className="membership-section-title">Common questions</h2>

                <div className="membership-faq-item">
                    <h3>Can I cancel anytime?</h3>
                    <p>
                        Yes. Open your Account page or the Stripe billing
                        portal, click cancel, and that&rsquo;s it. If
                        you&rsquo;re still in your trial, you won&rsquo;t be
                        charged. If you&rsquo;re past the trial, you keep
                        Pro until the end of your current billing period.
                    </p>
                </div>

                <div className="membership-faq-item">
                    <h3>What happens to my saved trips if I downgrade?</h3>
                    <p>
                        Your existing trips stay put — we never delete them.
                        You won&rsquo;t be able to <em>save</em> new ones
                        beyond the free limit until you upgrade again, but
                        everything you&rsquo;ve already built is there
                        waiting.
                    </p>
                </div>

                <div className="membership-faq-item">
                    <h3>Are there refunds?</h3>
                    <p>
                        We don&rsquo;t issue partial refunds for unused
                        time — your subscription stays active until the end
                        of the period you paid for. If something genuinely
                        broken on our side stops you from using Pro, contact
                        us and we&rsquo;ll make it right.
                    </p>
                </div>

                <div className="membership-faq-item">
                    <h3>Is my data used to train AI?</h3>
                    <p>
                        No. Your searches and trips are stored on DaTryp.com for
                        you to use, not handed to anyone else to train on.
                        Each AI search call goes to the recommendation
                        provider just to answer that single query, and
                        nothing is retained on their side beyond standard
                        request logs.
                    </p>
                </div>

                <div className="membership-faq-item">
                    <h3>Can I switch between monthly and yearly?</h3>
                    <p>
                        Yes. From your Account page, click{' '}
                        <em>Manage billing</em>, and Stripe lets you change
                        the cadence whenever you want. Switching to yearly
                        is the same price as 2 months free.
                    </p>
                </div>
            </section>

            <section className="membership-plans membership-plans--bottom">
                <h2 className="membership-section-title">Ready to upgrade?</h2>
                <PlanCards />
            </section>
        </article>
    </Layout>
);

export default Membership;
