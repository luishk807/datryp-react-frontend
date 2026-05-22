import { useState } from 'react';
import Layout from 'components/common/Layout/SubLayout';
import SupportAgentRoundedIcon from '@mui/icons-material/SupportAgentRounded';
import LightbulbRoundedIcon from '@mui/icons-material/LightbulbRounded';
import BugReportRoundedIcon from '@mui/icons-material/BugReportRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import ButtonCustom from 'components/common/FormFields/ButtonCustom';
import ErrorAlert from 'components/common/ErrorAlert';
import { useUser } from 'context/UserContext';
import { useSendContactForm } from 'api/hooks/useContact';
import { EMAIL_REGEX } from 'constants';
import './index.scss';

const CONTACT_EMAIL = 'info@datryp.com';

const REASONS = [
    {
        Icon: SupportAgentRoundedIcon,
        title: 'Help with your account',
        body: "Trouble signing in, paying, or syncing trips? We'll get you back on the road.",
    },
    {
        Icon: LightbulbRoundedIcon,
        title: 'Feature ideas',
        body: 'Something you wish DaTryp.com did? We read every suggestion and ship the good ones.',
    },
    {
        Icon: BugReportRoundedIcon,
        title: 'Bugs & feedback',
        body: 'Caught something broken or just off? Let us know what happened and what you expected.',
    },
];

const MAX_MESSAGE = 4000;
const MAX_SUBJECT = 200;
const MAX_NAME = 120;

const Contact = () => {
    const { user } = useUser();
    const mutation = useSendContactForm();

    const [name, setName] = useState(user?.name ?? '');
    const [email, setEmail] = useState(user?.email ?? '');
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [validationError, setValidationError] = useState<string | null>(null);
    const [sent, setSent] = useState(false);

    const reset = () => {
        setName(user?.name ?? '');
        setEmail(user?.email ?? '');
        setSubject('');
        setMessage('');
        setValidationError(null);
        setSent(false);
        mutation.reset();
    };

    const validate = (): string | null => {
        if (!name.trim()) return 'Please enter your name.';
        if (!email.trim()) return 'Please enter your email.';
        if (!EMAIL_REGEX.test(email.trim()))
            return "That email doesn't look right.";
        if (!subject.trim()) return 'Please add a subject.';
        if (!message.trim()) return 'Please write a message.';
        return null;
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const problem = validate();
        if (problem) {
            setValidationError(problem);
            return;
        }
        setValidationError(null);
        try {
            await mutation.mutateAsync({
                name: name.trim(),
                email: email.trim(),
                subject: subject.trim(),
                message: message.trim(),
            });
            setSent(true);
        } catch {
            // mutation.error is already populated; rendered below.
        }
    };

    const disabled = mutation.isPending;
    const errorMessage =
        validationError ?? (mutation.error ? mutation.error.message : null);

    return (
        <Layout title="Contact us">
            <article className="contact-page">
                <section className="contact-hero">
                    <h1 className="contact-hero-title">We're here to help.</h1>
                    <p className="contact-hero-lede">
                        Drop us a line and the team will get back to you
                        within one or two business days. You can also email{' '}
                        <a
                            href={`mailto:${CONTACT_EMAIL}`}
                            className="contact-inline-link"
                        >
                            {CONTACT_EMAIL}
                        </a>{' '}
                        directly.
                    </p>
                </section>

                {sent ? (
                    <section className="contact-success" role="status">
                        <CheckCircleRoundedIcon className="contact-success-icon" />
                        <h2 className="contact-success-title">
                            Message sent — thank you!
                        </h2>
                        <p className="contact-success-body">
                            We've routed it to{' '}
                            <strong>{CONTACT_EMAIL}</strong>. Expect a reply
                            at <strong>{email}</strong> within one or two
                            business days.
                        </p>
                        <ButtonCustom
                            type="line"
                            capitalizeType="uppercase"
                            label="Send another"
                            onClick={reset}
                        />
                    </section>
                ) : (
                    <section className="contact-form-section">
                        <form
                            className="contact-form"
                            onSubmit={handleSubmit}
                            noValidate
                        >
                            <div className="contact-field-row">
                                <label className="contact-field">
                                    <span className="contact-field-label">
                                        Your name
                                    </span>
                                    <input
                                        type="text"
                                        className="contact-input"
                                        value={name}
                                        onChange={(e) =>
                                            setName(e.target.value)
                                        }
                                        maxLength={MAX_NAME}
                                        placeholder="Jane Traveller"
                                        disabled={disabled}
                                        autoComplete="name"
                                        required
                                    />
                                </label>
                                <label className="contact-field">
                                    <span className="contact-field-label">
                                        Email
                                    </span>
                                    <input
                                        type="email"
                                        className="contact-input"
                                        value={email}
                                        onChange={(e) =>
                                            setEmail(e.target.value)
                                        }
                                        placeholder="you@example.com"
                                        disabled={disabled}
                                        autoComplete="email"
                                        required
                                    />
                                </label>
                            </div>
                            <label className="contact-field">
                                <span className="contact-field-label">
                                    Subject
                                </span>
                                <input
                                    type="text"
                                    className="contact-input"
                                    value={subject}
                                    onChange={(e) =>
                                        setSubject(e.target.value)
                                    }
                                    maxLength={MAX_SUBJECT}
                                    placeholder="What's on your mind?"
                                    disabled={disabled}
                                    required
                                />
                            </label>
                            <label className="contact-field">
                                <span className="contact-field-label">
                                    Message
                                </span>
                                <textarea
                                    className="contact-input contact-textarea"
                                    value={message}
                                    onChange={(e) =>
                                        setMessage(e.target.value)
                                    }
                                    maxLength={MAX_MESSAGE}
                                    rows={6}
                                    placeholder="Tell us what's up. Steps to reproduce, ideas, anything goes."
                                    disabled={disabled}
                                    required
                                />
                                <span className="contact-counter">
                                    {message.length} / {MAX_MESSAGE}
                                </span>
                            </label>

                            {errorMessage && (
                                <ErrorAlert>{errorMessage}</ErrorAlert>
                            )}

                            <div className="contact-form-actions">
                                <ButtonCustom
                                    type="standard"
                                    capitalizeType="uppercase"
                                    className="contact-submit-btn"
                                    nativeType="submit"
                                    disabled={disabled}
                                >
                                    <SendRoundedIcon className="contact-submit-icon" />
                                    <span>
                                        {mutation.isPending
                                            ? 'Sending…'
                                            : 'Send message'}
                                    </span>
                                </ButtonCustom>
                            </div>
                        </form>
                    </section>
                )}

                <section className="contact-reasons">
                    {REASONS.map(({ Icon, title, body }) => (
                        <div className="contact-reason" key={title}>
                            <Icon className="contact-reason-icon" />
                            <h3 className="contact-reason-title">{title}</h3>
                            <p className="contact-reason-body">{body}</p>
                        </div>
                    ))}
                </section>

                <section className="contact-section">
                    <h2>A few notes</h2>
                    <ul className="contact-list">
                        <li>
                            We reply from a real human inbox at{' '}
                            <strong>{CONTACT_EMAIL}</strong>.
                        </li>
                        <li>
                            Don't share passwords or payment details — we'll
                            never ask for them.
                        </li>
                        <li>
                            A screenshot or steps to reproduce a bug helps us
                            ship a fix faster.
                        </li>
                    </ul>
                </section>
            </article>
        </Layout>
    );
};

export default Contact;
