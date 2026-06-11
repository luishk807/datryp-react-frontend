import { Link } from 'react-router-dom';
import Layout from 'components/common/Layout/SubLayout';
import './index.scss';

const LAST_UPDATED = 'June 10, 2026';

/** Public, no-login SMS / text-messaging policy. Doubles as the carrier
 *  "proof of consent" page for A2P 10DLC / toll-free verification: it shows
 *  exactly how a user opts in, the consent language they agree to, what
 *  messages we send, and the STOP/HELP behaviour — all reachable without an
 *  account so a reviewer can verify it. Linked from the Account SMS opt-in. */
const SmsPolicy = () => (
    <Layout title="SMS Messaging Policy">
        <article className="sms-policy-page">
            <p className="sms-policy-last-updated">
                Last updated: {LAST_UPDATED}
            </p>

            <section className="sms-policy-section">
                <h2>The short version</h2>
                <p>
                    DaTryp sends SMS text messages only to users who have
                    voluntarily opted in. SMS notifications are{' '}
                    <strong>off by default</strong>. You must add a phone
                    number and explicitly turn them on before we send you any
                    text. We never send marketing or promotional texts, and you
                    can opt out at any time by replying <strong>STOP</strong>.
                </p>
            </section>

            <section className="sms-policy-section">
                <h2>How you opt in</h2>
                <p>
                    Opt-in happens inside your DaTryp account — it is never
                    automatic:
                </p>
                <ol>
                    <li>Add a phone number under <em>Account &rsaquo; Profile</em>.</li>
                    <li>
                        Open <em>Account &rsaquo; Notifications</em> and check the
                        SMS consent box.
                    </li>
                    <li>Turn on the <em>SMS notifications</em> toggle.</li>
                </ol>
                <p>
                    The toggle cannot be enabled until you have checked the
                    consent box. The exact consent language you agree to is:
                </p>
                <blockquote className="sms-policy-consent">
                    &ldquo;I agree to receive SMS text messages from DaTryp.
                    Message frequency varies. Message and data rates may apply.
                    Reply STOP to opt out and HELP for help.&rdquo;
                </blockquote>
            </section>

            <section className="sms-policy-section">
                <h2>What messages we send</h2>
                <p>
                    Messages are limited to account- and trip-related
                    notifications:
                </p>
                <ul>
                    <li>Account verification and security alerts</li>
                    <li>Trip reminders and time-sensitive travel alerts</li>
                    <li>Itinerary updates</li>
                    <li>Transportation alerts (flights, trains, transfers)</li>
                    <li>Booking confirmations</li>
                    <li>Friend and shared-trip notifications</li>
                </ul>
                <p>
                    We do <strong>not</strong> send marketing or promotional
                    text messages.
                </p>
            </section>

            <section className="sms-policy-section">
                <h2>Message frequency &amp; rates</h2>
                <p>
                    Message frequency varies based on your trips and activity.
                    Message and data rates may apply, depending on your mobile
                    carrier and plan. DaTryp does not charge you for SMS
                    messages.
                </p>
            </section>

            <section className="sms-policy-section">
                <h2>Opting out and getting help</h2>
                <p>
                    Reply <strong>STOP</strong> to any DaTryp text to
                    unsubscribe — you will receive a final confirmation and no
                    further messages. Reply <strong>HELP</strong> for help. You
                    can also turn SMS notifications off at any time under{' '}
                    <em>Account &rsaquo; Notifications</em>, or uncheck the
                    consent box to revoke consent entirely.
                </p>
                <p>
                    For assistance, email{' '}
                    <a href="mailto:info@datryp.com">info@datryp.com</a>.
                </p>
            </section>

            <section className="sms-policy-section">
                <h2>Privacy</h2>
                <p>
                    We do not sell or share your phone number or SMS opt-in
                    information with third parties for their marketing. See our{' '}
                    <Link to="/privacy">Privacy Policy</Link> and{' '}
                    <Link to="/terms">Terms of Service</Link> for the full
                    details.
                </p>
            </section>
        </article>
    </Layout>
);

export default SmsPolicy;
