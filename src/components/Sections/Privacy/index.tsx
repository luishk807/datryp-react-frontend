import Layout from 'components/common/Layout/SubLayout';
import './index.scss';

const LAST_UPDATED = 'May 30, 2026';

const Privacy = () => (
    <Layout title="Privacy Policy">
        <article className="privacy-page">
            <p className="privacy-last-updated">Last updated: {LAST_UPDATED}</p>

            <section className="privacy-section">
                <h2>The short version</h2>
                <p>
                    DaTryp.com keeps the data we need to run the product and nothing
                    else. We don&rsquo;t sell your information. The sections below
                    spell out what we collect, how we use it, and the choices you
                    have.
                </p>
            </section>

            <section className="privacy-section">
                <h2>What we collect</h2>
                <p>
                    <strong>Account details</strong> you give us when you sign up:
                    name, email, password (stored as a one-way hash), and
                    optionally phone number, birth year, gender, country of birth,
                    and travel interests. If you sign in with Google, we receive
                    your name, email, and Google profile ID — never your Google
                    password.
                </p>
                <p>
                    <strong>Optional travel-companion preferences</strong> you
                    can set on the Account page: whether you usually travel
                    solo, as a couple, with friends, or as a family with kids.
                    If you indicate &ldquo;family with kids,&rdquo; you may also
                    pick the age <em>ranges</em> of your kids (e.g.
                    &ldquo;3–5&rdquo;, &ldquo;6–9&rdquo;). We deliberately
                    collect <em>only</em> coarse age ranges — never exact
                    ages, names, dates of birth, or marital status. These
                    fields are opt-in, default empty, and editable or
                    clearable at any time. We use them to bias trip
                    recommendations (e.g. Disney + toddler-friendly picks
                    for families with young kids; couple-style activities
                    when you select &ldquo;couple&rdquo;).
                </p>
                <p>
                    <strong>Travel data</strong> you create inside DaTryp.com: trips,
                    itineraries, activities, saved places, visited places, bucket
                    list entries, reviews, and search history.
                </p>
                <p>
                    <strong>Social data</strong> tied to the people you plan with:
                    friend requests, accepted friendships, and the participants
                    on shared trips.
                </p>
                <p>
                    <strong>Billing data</strong> if you subscribe to Pro:
                    handled by Stripe. We store your Stripe customer ID and
                    subscription status — we never see or store your card number.
                </p>
                <p>
                    <strong>Technical data</strong> we receive automatically:
                    basic request logs, browser/device info, and (if you opt in)
                    a push-notification subscription.
                </p>
                <p>
                    <strong>Product analytics</strong> from your use of the
                    site: which pages you visit, which features you click on,
                    and a stable per-browser identifier so we can tell
                    one user&rsquo;s session apart from another. When you
                    sign in, we associate this identifier with your
                    DaTryp.com account so we can answer questions like
                    &ldquo;does the AI trip builder convert better than the
                    manual flow?&rdquo; We do <em>not</em> record video of
                    your sessions, and form inputs marked sensitive (phone
                    number, password, payment fields) are masked in
                    transit. We don&rsquo;t use this data for advertising.
                </p>
            </section>

            <section className="privacy-section">
                <h2>How we use it</h2>
                <p>
                    To run the product — sign you in, save your itineraries,
                    recommend places, show your friends, send notifications
                    you&rsquo;ve enabled, and process payments. We also use
                    aggregated, non-identifying signals (like how many people
                    searched a city this month) to improve recommendations.
                </p>
            </section>

            <section className="privacy-section">
                <h2>AI personalization &amp; what we send to OpenAI</h2>
                <p>
                    Some AI features (AI search, AI itinerary suggestions,
                    bucket-list trip generation) only send the text of your
                    query — nothing from your profile travels with it.
                </p>
                <p>
                    A few personalized features send a small set of
                    profile fields to our AI provider (currently OpenAI)
                    so the recommendation can match your situation:
                </p>
                <ul>
                    <li>
                        <strong>Places you might love</strong> sends your
                        chosen interests, traveler styles, and dream
                        destinations (labels only, not your name or email).
                    </li>
                    <li>
                        <strong>Upcoming holiday</strong> sends the name
                        of your country of birth so the holiday picks
                        match what you celebrate.
                    </li>
                    <li>
                        <strong>Your monthly top pick (Pro)</strong> sends
                        your approximate age (derived from your birth
                        year), your country of birth, your gender (if you
                        chose to share one), and your interests/traveler
                        styles. We never send your name, email, friends
                        list, payment info, or any other directly
                        identifying field.
                    </li>
                    <li>
                        <strong>Trip recommendations</strong> (when you
                        ask the AI for trip ideas) may also send the
                        opt-in travel-companion slugs and kids-age
                        ranges you set on the Account page — so a
                        Disney query knows whether to surface
                        toddler-friendly attractions and a couples
                        retreat knows to skip the kid-club. Like
                        everything else in this list, these fields are
                        slugs / coarse ranges only, never names or
                        exact ages.
                    </li>
                </ul>
                <p>
                    OpenAI processes these inputs only to generate that
                    single response; per their API terms, they don&rsquo;t
                    use the data to train their models. You can clear or
                    change any of these fields any time from the Account
                    page — doing so wipes our cached recommendation and
                    regenerates it next time you visit.
                </p>
            </section>

            <section className="privacy-section">
                <h2>Who else handles your data</h2>
                <p>
                    A small set of trusted services help us run DaTryp.com:
                </p>
                <ul>
                    <li>
                        <strong>Stripe</strong> — processes subscription payments.
                    </li>
                    <li>
                        <strong>SendGrid</strong> — sends transactional and
                        share-a-place emails.
                    </li>
                    <li>
                        <strong>OpenAI</strong> — generates AI search and
                        itinerary recommendations from your query text.
                    </li>
                    <li>
                        <strong>Google</strong> — handles &ldquo;Sign in with
                        Google&rdquo; if you use it.
                    </li>
                    <li>
                        <strong>Amazon Web Services</strong> — hosts our backend,
                        database, and image CDN.
                    </li>
                    <li>
                        <strong>Unsplash</strong> — provides destination photos.
                        Your browser fetches images directly from Unsplash&rsquo;s
                        CDN, which means they see your IP address.
                    </li>
                    <li>
                        <strong>PostHog</strong> — collects the product
                        analytics events described above (pageviews, clicks,
                        and a per-browser identifier). PostHog sees your IP
                        address and approximate location at the city level
                        for the purpose of analytics; per their data
                        processing terms, they don&rsquo;t use your data
                        for any purpose other than serving us. We send only
                        feature-usage events and an opaque user id; we never
                        send sensitive fields like phone, password, or
                        payment info.
                    </li>
                </ul>
                <p>
                    We don&rsquo;t sell your data, and we don&rsquo;t share it
                    with advertisers.
                </p>
            </section>

            <section className="privacy-section">
                <h2>What other users can see</h2>
                <p>
                    Your name and profile show up to people you add as friends
                    and to participants on trips you share with them. Trips,
                    activities, and notes inside a shared itinerary are visible
                    to everyone on that trip. Your visited places, bucket list,
                    and saved places are private to you unless you choose to
                    share a specific item.
                </p>
            </section>

            <section className="privacy-section">
                <h2>Your choices</h2>
                <p>
                    You can update your profile and preferences from
                    <em> Account</em>. You can delete a trip, a saved place, a
                    review, or any piece of content from inside the product. To
                    delete your entire account, contact us through the link in
                    the footer — we&rsquo;ll remove your personal data within
                    30 days, except for anything we&rsquo;re required to keep
                    for legal or billing reasons.
                </p>
                <p>
                    You can opt out of non-essential emails from your account
                    settings, and you can disable push notifications from your
                    browser at any time.
                </p>
            </section>

            <section className="privacy-section">
                <h2>Cookies and similar tech</h2>
                <p>
                    We use a small number of cookies and local storage entries
                    to keep you signed in and to remember your preferences. We
                    don&rsquo;t use third-party advertising or cross-site
                    tracking cookies.
                </p>
            </section>

            <section className="privacy-section">
                <h2>Security</h2>
                <p>
                    We use HTTPS everywhere, hash passwords with bcrypt, and
                    restrict who on our side can see user data. No system is
                    perfect — if you spot a security issue, please reach us
                    through the contact link in the footer.
                </p>
            </section>

            <section className="privacy-section">
                <h2>Children</h2>
                <p>
                    DaTryp.com isn&rsquo;t intended for children under 13. If we
                    learn we&rsquo;ve collected data from a child under 13,
                    we&rsquo;ll delete it.
                </p>
            </section>

            <section className="privacy-section">
                <h2>Changes</h2>
                <p>
                    We may update this policy as the product evolves. When we
                    do, we&rsquo;ll change the &ldquo;Last updated&rdquo; date
                    at the top of this page. If the change is significant,
                    we&rsquo;ll also let you know in-product or by email.
                </p>
            </section>

            <section className="privacy-section">
                <h2>Contact</h2>
                <p>
                    Questions, requests, or want a copy of your data? Reach us
                    through the contact link in the footer.
                </p>
            </section>
        </article>
    </Layout>
);

export default Privacy;
