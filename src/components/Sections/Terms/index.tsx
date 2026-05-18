import Layout from 'components/common/Layout/SubLayout';
import './index.scss';

const LAST_UPDATED = 'May 18, 2026';

const Terms = () => (
    <Layout title="Terms of Use">
        <article className="terms-page">
            <p className="terms-last-updated">Last updated: {LAST_UPDATED}</p>

            <section className="terms-section">
                <h2>What daTryp is</h2>
                <p>
                    daTryp is a travel-planning tool. It helps you discover
                    destinations, build itineraries, save the places you want to
                    visit, and share trips with friends. Some features use AI to
                    suggest places and activities based on what you type.
                </p>
            </section>

            <section className="terms-section">
                <h2>Using AI search</h2>
                <p>
                    Our AI search is built to answer questions about trips,
                    destinations, places, and activities. Searches that aren&rsquo;t
                    about travel — for example, requests involving weapons, drugs,
                    sexual content, or self-harm — may not return results. This
                    isn&rsquo;t a punishment; it just isn&rsquo;t what daTryp is for.
                    Try a different search.
                </p>
                <p>
                    If you think a travel-related search was blocked by mistake,
                    rephrase it (for example, &ldquo;Amsterdam coffee culture&rdquo;
                    instead of a more loaded keyword) and try again.
                </p>
            </section>

            <section className="terms-section">
                <h2>Your account</h2>
                <p>
                    You must be at least 13 years old to use daTryp. You&rsquo;re
                    responsible for keeping your sign-in details safe and for the
                    activity that happens under your account.
                </p>
            </section>

            <section className="terms-section">
                <h2>Content you create</h2>
                <p>
                    Trips, reviews, and notes you write stay yours. By posting them
                    on daTryp, you let us display them inside the product (for
                    example, in your itinerary or in places you&rsquo;ve marked as
                    visited). Don&rsquo;t post content that&rsquo;s illegal, hateful,
                    or that you don&rsquo;t have the right to share.
                </p>
            </section>

            <section className="terms-section">
                <h2>Service availability</h2>
                <p>
                    daTryp is offered as-is. We try hard to keep things working, but
                    we can&rsquo;t guarantee the service will be uninterrupted, or
                    that the recommendations are perfectly accurate. Confirm
                    important details (visas, opening hours, prices, safety
                    advisories) with an official source before you travel.
                </p>
            </section>

            <section className="terms-section">
                <h2>Changes</h2>
                <p>
                    We may update these terms as the product evolves. When we do,
                    we&rsquo;ll change the &ldquo;Last updated&rdquo; date at the
                    top of this page. Continuing to use daTryp after a change means
                    you&rsquo;re fine with the updated terms.
                </p>
            </section>

            <section className="terms-section">
                <h2>Contact</h2>
                <p>
                    Questions or feedback? Reach us through the contact link in the
                    footer.
                </p>
            </section>
        </article>
    </Layout>
);

export default Terms;
