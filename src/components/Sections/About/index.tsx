import Layout from 'components/common/Layout/SubLayout';
import FlightTakeoffRoundedIcon from '@mui/icons-material/FlightTakeoffRounded';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import GroupRoundedIcon from '@mui/icons-material/GroupRounded';
import MapRoundedIcon from '@mui/icons-material/MapRounded';
import './index.scss';

const FEATURES = [
    {
        Icon: AutoAwesomeIcon,
        title: 'AI that gets travel',
        body: 'Describe the trip in plain language — "two weeks in Japan, mostly food" — and let the recommender propose destinations and activities.',
    },
    {
        Icon: MapRoundedIcon,
        title: 'Itineraries that flow',
        body: 'Drag, drop, and reorder days. Single-destination or multi-city, the tool keeps the timeline tidy and your budget in view.',
    },
    {
        Icon: GroupRoundedIcon,
        title: 'Plan with friends',
        body: 'Invite organizers and participants, split budgets per activity, and keep everyone in sync with in-app + email notifications.',
    },
    {
        Icon: FlightTakeoffRoundedIcon,
        title: 'Yours forever',
        body: "Completed trips stay in your list as a record of where you've been. Saved places and bucket lists travel with you.",
    },
];

const About = () => (
    <Layout title="About DaTryp.com">
        <article className="about-page">
            <section className="about-hero">
                <h1 className="about-hero-title">
                    Plan trips that feel effortless.
                </h1>
                <p className="about-hero-lede">
                    DaTryp.com helps travelers go from a vague idea to a real
                    itinerary — quickly, beautifully, and with the people they
                    love. Whether it's a weekend in a neighbor city or a
                    six-country tour, we keep the planning fun and the
                    receipts split fairly.
                </p>
            </section>

            <section className="about-features">
                {FEATURES.map(({ Icon, title, body }) => (
                    <div className="about-feature" key={title}>
                        <Icon className="about-feature-icon" />
                        <h3 className="about-feature-title">{title}</h3>
                        <p className="about-feature-body">{body}</p>
                    </div>
                ))}
            </section>

            <section className="about-section">
                <h2>Our story</h2>
                <p>
                    DaTryp.com started with a frustration most travelers know: trip
                    planning lives across a dozen tabs, group chats, and
                    half-finished spreadsheets. We wanted one calm place — one
                    that asks the right questions, suggests good answers, and
                    gets out of the way once the trip is set.
                </p>
                <p>
                    We're a small team that loves maps, layovers, and the
                    moment a tentative plan becomes a real ticket. We build
                    DaTryp.com for travelers like us.
                </p>
            </section>

            <section className="about-section">
                <h2>What's next</h2>
                <p>
                    More AI, more collaboration, better mobile, and proper
                    offline support. The roadmap is shaped by the people using
                    the product — if there's something you'd love to see, the{' '}
                    <a href="/contact" className="about-inline-link">
                        contact page
                    </a>{' '}
                    is the fastest way to tell us.
                </p>
            </section>
        </article>
    </Layout>
);

export default About;
