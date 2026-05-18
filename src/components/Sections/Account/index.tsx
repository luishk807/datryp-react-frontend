import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Layout from 'components/common/Layout/SubLayout';
import ButtonCustom from 'components/common/FormFields/ButtonCustom';
import InputField from 'components/common/FormFields/InputField';
import DropDown from 'components/common/FormFields/DropDown';
import Field from 'components/common/FormFields/Field';
import Toggle from 'components/common/FormFields/Toggle';
import SubscriptionSection from './SubscriptionSection';
import { useUser } from 'context/UserContext';
import type { NotificationPrefs } from 'context/UserContext';
import { useCountries } from 'api/hooks/useCountries';
import { BUTTON_VARIANT } from 'constants';
import './index.scss';

const DEFAULT_NOTIFICATIONS: NotificationPrefs = {
    email: true,
    sms: false,
    push: true,
};

export const Account = () => {
    const { user, updateUser } = useUser();
    const { hash } = useLocation();
    const { data: countries = [], isLoading: countriesLoading } = useCountries('', {
        limit: 300,
    });

    // Scroll to the section referenced by the URL hash on mount / hash change.
    // The Header's "Subscription" / "Upgrade to Pro" menu items deep-link via
    // `/account#subscription`; without this effect React Router would land the
    // user at the top of the page and force them to hunt.
    useEffect(() => {
        if (!hash) return;
        const id = hash.replace(/^#/, '');
        const el = document.getElementById(id);
        if (el) {
            // requestAnimationFrame so the DOM has finished laying out before
            // we measure scroll position.
            requestAnimationFrame(() => {
                el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
        }
    }, [hash]);

    // Profile
    const [name, setName] = useState(user?.name ?? '');
    const [email, setEmail] = useState(user?.email ?? '');
    const [phone, setPhone] = useState(user?.phone ?? '');
    const [dob, setDob] = useState(user?.dob ?? '');
    const [countryOfBirth, setCountryOfBirth] = useState(
        user?.countryOfBirth ?? ''
    );
    const [profileSaved, setProfileSaved] = useState(false);

    // Password
    const [currentPwd, setCurrentPwd] = useState('');
    const [newPwd, setNewPwd] = useState('');
    const [confirmPwd, setConfirmPwd] = useState('');
    const [pwdMessage, setPwdMessage] = useState<{
        type: 'success' | 'error';
        text: string;
    } | null>(null);

    // Preferences
    const [preferredAirport, setPreferredAirport] = useState(
        user?.preferredAirport ?? ''
    );
    const [notifications, setNotifications] = useState<NotificationPrefs>(
        user?.notifications ?? DEFAULT_NOTIFICATIONS
    );
    const [prefsSaved, setPrefsSaved] = useState(false);

    useEffect(() => {
        if (!user) return;
        setName(user.name);
        setEmail(user.email ?? '');
        setPhone(user.phone ?? '');
        setDob(user.dob ?? '');
        setCountryOfBirth(user.countryOfBirth ?? '');
        setPreferredAirport(user.preferredAirport ?? '');
        setNotifications(user.notifications ?? DEFAULT_NOTIFICATIONS);
    }, [user]);

    const initial = useMemo(
        () => (user?.name ? user.name.charAt(0).toUpperCase() : '?'),
        [user]
    );

    if (!user) {
        return (
            <Layout title="Account">
                <div className="account-page account-logged-out">
                    <p>Log in to manage your profile.</p>
                </div>
            </Layout>
        );
    }

    // ---- Handlers ----
    const handleProfileSave = () => {
        if (!name.trim()) return;
        updateUser({
            name: name.trim(),
            email: email.trim() || undefined,
            phone: phone.trim() || undefined,
            dob: dob || undefined,
            countryOfBirth: countryOfBirth.trim() || undefined,
        });
        setProfileSaved(true);
        setTimeout(() => setProfileSaved(false), 2000);
    };

    const handlePasswordSave = () => {
        if (!currentPwd || !newPwd || !confirmPwd) {
            setPwdMessage({ type: 'error', text: 'Fill in all password fields.' });
            return;
        }
        if (newPwd !== confirmPwd) {
            setPwdMessage({ type: 'error', text: "Passwords don't match." });
            return;
        }
        if (newPwd.length < 6) {
            setPwdMessage({
                type: 'error',
                text: 'New password must be at least 6 characters.',
            });
            return;
        }
        setCurrentPwd('');
        setNewPwd('');
        setConfirmPwd('');
        setPwdMessage({ type: 'success', text: 'Password updated.' });
        setTimeout(() => setPwdMessage(null), 2500);
    };

    const handlePrefsSave = () => {
        updateUser({
            preferredAirport: preferredAirport.trim() || undefined,
            notifications,
        });
        setPrefsSaved(true);
        setTimeout(() => setPrefsSaved(false), 2000);
    };

    return (
        <Layout title="Account">
            <div className="account-page">
                {/* Profile */}
                <section className="account-card">
                    <div className="account-card-header">
                        <span className="account-avatar">{initial}</span>
                        <div className="account-card-headings">
                            <h2 className="account-card-title">Profile</h2>
                            <p className="account-card-subtitle">
                                Manage how your name, email and phone appear.
                            </p>
                        </div>
                    </div>
                    <div className="account-form">
                        <InputField
                            variant="bare"
                            label="Full name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Your name"
                            required={false}
                        />
                        <InputField
                            variant="bare"
                            label="Email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            required={false}
                        />
                        <InputField
                            variant="bare"
                            label="Phone"
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="+1 555 123 4567"
                            required={false}
                        />
                        <InputField
                            variant="bare"
                            label="Date of birth"
                            type="date"
                            value={dob}
                            onChange={(e) => setDob(e.target.value)}
                            required={false}
                        />
                        <DropDown
                            variant="bare"
                            label="Country of birth"
                            options={countries}
                            valueKey="code"
                            value={countryOfBirth}
                            placeholder={countriesLoading ? 'Loading countries…' : 'Select a country'}
                            disabled={countriesLoading}
                            onChange={(opt) => setCountryOfBirth(opt?.code ?? '')}
                        />
                        <div className="account-actions">
                            <ButtonCustom
                                type={BUTTON_VARIANT.STANDARD_MINI}
                                capitalizeType="uppercase"
                                label={profileSaved ? 'Saved' : 'Save profile'}
                                onClick={handleProfileSave}
                            />
                        </div>
                    </div>
                </section>

                <SubscriptionSection />

                {/* Password */}
                <section className="account-card">
                    <div className="account-card-headings simple">
                        <h2 className="account-card-title">Password</h2>
                        <p className="account-card-subtitle">
                            Use at least 6 characters.
                        </p>
                    </div>
                    <div className="account-form">
                        <InputField
                            variant="bare"
                            label="Current password"
                            type="password"
                            value={currentPwd}
                            onChange={(e) => setCurrentPwd(e.target.value)}
                            placeholder="••••••••"
                            required={false}
                        />
                        <InputField
                            variant="bare"
                            label="New password"
                            type="password"
                            value={newPwd}
                            onChange={(e) => setNewPwd(e.target.value)}
                            placeholder="••••••••"
                            required={false}
                        />
                        <InputField
                            variant="bare"
                            label="Confirm new password"
                            type="password"
                            value={confirmPwd}
                            onChange={(e) => setConfirmPwd(e.target.value)}
                            placeholder="••••••••"
                            required={false}
                        />
                        {pwdMessage && (
                            <div
                                className={`account-message account-message-${pwdMessage.type}`}
                            >
                                {pwdMessage.text}
                            </div>
                        )}
                        <div className="account-actions">
                            <ButtonCustom
                                type={BUTTON_VARIANT.STANDARD_MINI}
                                capitalizeType="uppercase"
                                label="Update password"
                                onClick={handlePasswordSave}
                            />
                        </div>
                    </div>
                </section>

                {/* Preferences */}
                <section className="account-card" id="preferences">
                    <div className="account-card-headings simple">
                        <h2 className="account-card-title">Preferences</h2>
                        <p className="account-card-subtitle">
                            Defaults we'll use when planning new trips.
                        </p>
                    </div>
                    <div className="account-form">
                        <InputField
                            variant="bare"
                            label="Preferred airport"
                            type="text"
                            value={preferredAirport}
                            onChange={(e) => setPreferredAirport(e.target.value)}
                            placeholder="e.g. JFK, SFO, LAX"
                            required={false}
                        />
                        <Field label="Notifications">
                            <div className="account-toggles">
                                <Toggle
                                    label="Email updates"
                                    checked={notifications.email}
                                    onChange={(v) =>
                                        setNotifications((p) => ({ ...p, email: v }))
                                    }
                                />
                                <Toggle
                                    label="SMS reminders"
                                    checked={notifications.sms}
                                    onChange={(v) =>
                                        setNotifications((p) => ({ ...p, sms: v }))
                                    }
                                />
                                <Toggle
                                    label="Push notifications"
                                    checked={notifications.push}
                                    onChange={(v) =>
                                        setNotifications((p) => ({ ...p, push: v }))
                                    }
                                />
                            </div>
                        </Field>
                        <div className="account-actions">
                            <ButtonCustom
                                type={BUTTON_VARIANT.STANDARD_MINI}
                                capitalizeType="uppercase"
                                label={prefsSaved ? 'Saved' : 'Save preferences'}
                                onClick={handlePrefsSave}
                            />
                        </div>
                    </div>
                </section>

            </div>
        </Layout>
    );
};


export default Account;
