import Layout from 'components/common/Layout/SubLayout';
import './index.scss';

const LAST_UPDATED = 'May 21, 2026';

const Privacy = () => (
    <Layout title="Privacy Policy">
        <article className="privacy-page">
            <p className="privacy-last-updated">Last updated: {LAST_UPDATED}</p>

            <section className="privacy-section">
                <h2>The short version</h2>
                <p>
                    daTryp keeps the data we need to run the product and nothing
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
                    <strong>Travel data</strong> you create inside daTryp: trips,
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
                <h2>AI search</h2>
                <p>
                    When you use AI search or AI itinerary suggestions, the text
                    of your query is sent to our AI provider (currently OpenAI)
                    to generate a response. We don&rsquo;t send your account
                    profile, your friends list, or other identifying information
                    along with the query.
                </p>
            </section>

            <section className="privacy-section">
                <h2>Who else handles your data</h2>
                <p>
                    A small set of trusted services help us run daTryp:
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
                    daTryp isn&rsquo;t intended for children under 13. If we
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
