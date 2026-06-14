import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import Layout from 'components/common/Layout/SubLayout';
import SupportAgentRoundedIcon from '@mui/icons-material/SupportAgentRounded';
import LightbulbRoundedIcon from '@mui/icons-material/LightbulbRounded';
import BugReportRoundedIcon from '@mui/icons-material/BugReportRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import MailOutlineRoundedIcon from '@mui/icons-material/MailOutlineRounded';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import PhotoCameraOutlinedIcon from '@mui/icons-material/PhotoCameraOutlined';
import { Accordion, AccordionDetails, AccordionSummary } from '@mui/material';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import { Link } from 'react-router-dom';
import ButtonCustom from 'components/common/FormFields/ButtonCustom';
import ErrorAlert from 'components/common/ErrorAlert';
import { useUser } from 'context/UserContext';
import { useSendContactForm } from 'api/hooks/useContact';
import { EMAIL_REGEX } from 'constants';
import './index.scss';

const CONTACT_EMAIL = 'info@datryp.com';

const FAQ_KEYS = ['replyTime', 'freeVsPro', 'cancel', 'delete', 'dataSharing'] as const;

const REASON_ICONS = [SupportAgentRoundedIcon, LightbulbRoundedIcon, BugReportRoundedIcon] as const;

const REASON_KEYS = ['account', 'ideas', 'bugs'] as const;

const MAX_MESSAGE = 4000;
const MAX_SUBJECT = 200;
const MAX_NAME = 120;

const Contact = () => {
    const { t } = useTranslation();
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
        if (!name.trim()) return t('contact.validation.name');
        if (!email.trim()) return t('contact.validation.email');
        if (!EMAIL_REGEX.test(email.trim())) return t('contact.validation.emailInvalid');
        if (!subject.trim()) return t('contact.validation.subject');
        if (!message.trim()) return t('contact.validation.message');
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
        <Layout title={t('contact.pageTitle')}>
            <article className="contact-page">
                <section className="contact-hero">
                    <h1 className="contact-hero-title">{t('contact.hero.title')}</h1>
                    <p className="contact-hero-lede">
                        <Trans
                            i18nKey="contact.hero.lede"
                            values={{ email: CONTACT_EMAIL }}
                            components={{
                                emailLink: (
                                    <a
                                        href={`mailto:${CONTACT_EMAIL}`}
                                        className="contact-inline-link"
                                    />
                                ),
                            }}
                        />
                    </p>
                </section>

                {/* Quick-reference callout — sits above the form so the
                    "we won't ask for passwords" warning and "screenshots
                    help" tip are visible BEFORE the user starts writing,
                    not buried at the bottom of the page. */}
                {!sent && (
                    <aside className="contact-tips" aria-label={t('contact.tips.aria')}>
                        <ul className="contact-tips-list">
                            <li>
                                <MailOutlineRoundedIcon className="contact-tips-icon" />
                                <span>
                                    <Trans
                                        i18nKey="contact.tips.humanInbox"
                                        values={{ email: CONTACT_EMAIL }}
                                        components={{ strong: <strong /> }}
                                    />
                                </span>
                            </li>
                            <li>
                                <LockOutlinedIcon className="contact-tips-icon" />
                                <span>{t('contact.tips.noPasswords')}</span>
                            </li>
                            <li>
                                <PhotoCameraOutlinedIcon className="contact-tips-icon" />
                                <span>{t('contact.tips.screenshot')}</span>
                            </li>
                        </ul>
                    </aside>
                )}

                {sent ? (
                    <section className="contact-success" role="status">
                        <CheckCircleRoundedIcon className="contact-success-icon" />
                        <h2 className="contact-success-title">
                            {t('contact.success.title')}
                        </h2>
                        <p className="contact-success-body">
                            <Trans
                                i18nKey="contact.success.body"
                                values={{ email: CONTACT_EMAIL, replyTo: email }}
                                components={{ strong: <strong /> }}
                            />
                        </p>
                        <ButtonCustom
                            type="line"
                            capitalizeType="uppercase"
                            label={t('contact.success.sendAnother')}
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
                                        {t('contact.form.nameLabel')}
                                    </span>
                                    <input
                                        type="text"
                                        className="contact-input"
                                        value={name}
                                        onChange={(e) =>
                                            setName(e.target.value)
                                        }
                                        maxLength={MAX_NAME}
                                        placeholder={t('contact.form.namePlaceholder')}
                                        disabled={disabled}
                                        autoComplete="name"
                                        required
                                    />
                                </label>
                                <label className="contact-field">
                                    <span className="contact-field-label">
                                        {t('contact.form.emailLabel')}
                                    </span>
                                    <input
                                        type="email"
                                        className="contact-input"
                                        value={email}
                                        onChange={(e) =>
                                            setEmail(e.target.value)
                                        }
                                        placeholder={t('contact.form.emailPlaceholder')}
                                        disabled={disabled}
                                        autoComplete="email"
                                        required
                                    />
                                </label>
                            </div>
                            <label className="contact-field">
                                <span className="contact-field-label">
                                    {t('contact.form.subjectLabel')}
                                </span>
                                <input
                                    type="text"
                                    className="contact-input"
                                    value={subject}
                                    onChange={(e) =>
                                        setSubject(e.target.value)
                                    }
                                    maxLength={MAX_SUBJECT}
                                    placeholder={t('contact.form.subjectPlaceholder')}
                                    disabled={disabled}
                                    required
                                />
                            </label>
                            <label className="contact-field">
                                <span className="contact-field-label">
                                    {t('contact.form.messageLabel')}
                                </span>
                                <textarea
                                    className="contact-input contact-textarea"
                                    value={message}
                                    onChange={(e) =>
                                        setMessage(e.target.value)
                                    }
                                    maxLength={MAX_MESSAGE}
                                    rows={6}
                                    placeholder={t('contact.form.messagePlaceholder')}
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
                                            ? t('contact.form.sending')
                                            : t('contact.form.submit')}
                                    </span>
                                </ButtonCustom>
                            </div>
                        </form>
                    </section>
                )}

                <section className="contact-reasons">
                    {REASON_KEYS.map((key, i) => {
                        const Icon = REASON_ICONS[i];
                        return (
                            <div className="contact-reason" key={key}>
                                <Icon className="contact-reason-icon" />
                                <h3 className="contact-reason-title">
                                    {t(`contact.reasons.${key}.title`)}
                                </h3>
                                <p className="contact-reason-body">
                                    {t(`contact.reasons.${key}.body`)}
                                </p>
                            </div>
                        );
                    })}
                </section>

                {/* Common-questions accordion — answers the questions
                    most people would otherwise email about (reply
                    time, billing, deletion, data sharing). Cuts inbox
                    volume and gets users to the answer faster. */}
                <section
                    className="contact-faq"
                    aria-label={t('contact.faq.aria')}
                >
                    <h2 className="contact-faq-title">{t('contact.faq.title')}</h2>
                    {FAQ_KEYS.map((key) => (
                        <Accordion
                            key={key}
                            disableGutters
                            elevation={0}
                            className="contact-faq-item"
                        >
                            <AccordionSummary
                                expandIcon={<ExpandMoreRoundedIcon />}
                                className="contact-faq-summary"
                            >
                                <span className="contact-faq-question">
                                    {t(`contact.faq.items.${key}.q`)}
                                </span>
                            </AccordionSummary>
                            <AccordionDetails className="contact-faq-answer">
                                <Trans
                                    i18nKey={`contact.faq.items.${key}.a`}
                                    components={{
                                        em: <em />,
                                        strong: <strong />,
                                        membershipLink: (
                                            <Link
                                                to="/membership"
                                                className="contact-inline-link"
                                            />
                                        ),
                                        accountLink: (
                                            <Link
                                                to="/account"
                                                className="contact-inline-link"
                                            />
                                        ),
                                        privacyLink: (
                                            <Link
                                                to="/privacy"
                                                className="contact-inline-link"
                                            />
                                        ),
                                    }}
                                />
                            </AccordionDetails>
                        </Accordion>
                    ))}
                </section>
            </article>
        </Layout>
    );
};

export default Contact;
