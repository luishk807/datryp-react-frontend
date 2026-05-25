import { Link } from 'react-router-dom';
import Layout from 'components/common/Layout/SubLayout';
import FlightTakeoffRoundedIcon from '@mui/icons-material/FlightTakeoffRounded';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import GroupRoundedIcon from '@mui/icons-material/GroupRounded';
import MapRoundedIcon from '@mui/icons-material/MapRounded';
import FavoriteRoundedIcon from '@mui/icons-material/FavoriteRounded';
import ExploreRoundedIcon from '@mui/icons-material/ExploreRounded';
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

const PILLARS = [
    {
        Icon: FavoriteRoundedIcon,
        label: 'We love travel',
    },
    {
        Icon: ExploreRoundedIcon,
        label: 'Built for explorers',
    },
    {
        Icon: AutoAwesomeIcon,
        label: 'Powered by AI',
    },
];

const About = () => (
    <Layout title="About DaTryp.com">
        <article className="about-page">
            <section className="about-hero">
                <span className="about-hero-eyebrow">Our motto</span>
                <h1 className="about-hero-motto">
                    Making More Trips Possible.
                </h1>
                <p className="about-hero-lede">
                    We love travel. DaTryp was born from the idea of having
                    a very useful tool to make life easier — a place to
                    record your memories and create your perfect trip.
                </p>
                <div className="about-hero-pillars" aria-hidden="true">
                    {PILLARS.map(({ Icon, label }) => (
                        <span className="about-pillar" key={label}>
                            <Icon className="about-pillar-icon" />
                            <span>{label}</span>
                        </span>
                    ))}
                </div>
            </section>

            <section className="about-features">
                {FEATURES.map(({ Icon, title, body }) => (
                    <div className="about-feature" key={title}>
                        <span className="about-feature-icon-wrap">
                            <Icon className="about-feature-icon" />
                        </span>
                        <h3 className="about-feature-title">{title}</h3>
                        <p className="about-feature-body">{body}</p>
                    </div>
                ))}
            </section>

            <section className="about-section about-story">
                <h2>Our story</h2>
                <p>
                    DaTryp started with a frustration most travelers know:
                    trip planning lives across a dozen tabs, group chats,
                    and half-finished spreadsheets. We wanted one calm
                    place — one that asks the right questions, suggests
                    good answers, and gets out of the way once the trip
                    is set.
                </p>
                <p>
                    We're a small team that loves maps, layovers, and the
                    moment a tentative plan becomes a real ticket. We
                    build DaTryp for travelers like us — and for the
                    millions of trips that almost happen, but never quite
                    do.
                </p>
            </section>

            <section className="about-section about-next">
                <h2>What's next</h2>
                <p>
                    More AI, deeper collaboration, better mobile, and
                    proper offline support. The roadmap is shaped by the
                    people using the product — if there's something
                    you'd love to see, the{' '}
                    <Link to="/contact" className="about-inline-link">
                        contact page
                    </Link>{' '}
                    is the fastest way to tell us.
                </p>
            </section>

            <section className="about-cta">
                <h3 className="about-cta-title">
                    Ready to make a trip possible?
                </h3>
                <Link to="/" className="about-cta-button">
                    Start planning
                </Link>
            </section>
        </article>
    </Layout>
);

export default About;
