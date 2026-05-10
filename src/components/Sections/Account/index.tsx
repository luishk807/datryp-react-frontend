import { useEffect, useMemo, useState } from 'react';
import Layout from 'components/common/Layout/SubLayout';
import ButtonCustom from 'components/common/FormFields/ButtonCustom';
import { useUser } from 'context/UserContext';
import type { NotificationPrefs } from 'context/UserContext';
import './index.css';

const DEFAULT_NOTIFICATIONS: NotificationPrefs = {
    email: true,
    sms: false,
    push: true,
};

export const Account = () => {
    const { user, updateUser } = useUser();

    // Profile
    const [name, setName] = useState(user?.name ?? '');
    const [email, setEmail] = useState(user?.email ?? '');
    const [phone, setPhone] = useState(user?.phone ?? '');
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
                        <Field label="Full name">
                            <input
                                className="account-input"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Your name"
                            />
                        </Field>
                        <Field label="Email">
                            <input
                                className="account-input"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                            />
                        </Field>
                        <Field label="Phone">
                            <input
                                className="account-input"
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="+1 555 123 4567"
                            />
                        </Field>
                        <div className="account-actions">
                            <ButtonCustom
                                type="standard"
                                capitalizeType="uppercase"
                                label={profileSaved ? 'Saved' : 'Save profile'}
                                onClick={handleProfileSave}
                            />
                        </div>
                    </div>
                </section>

                {/* Password */}
                <section className="account-card">
                    <div className="account-card-headings simple">
                        <h2 className="account-card-title">Password</h2>
                        <p className="account-card-subtitle">
                            Use at least 6 characters.
                        </p>
                    </div>
                    <div className="account-form">
                        <Field label="Current password">
                            <input
                                className="account-input"
                                type="password"
                                value={currentPwd}
                                onChange={(e) => setCurrentPwd(e.target.value)}
                                placeholder="••••••••"
                            />
                        </Field>
                        <Field label="New password">
                            <input
                                className="account-input"
                                type="password"
                                value={newPwd}
                                onChange={(e) => setNewPwd(e.target.value)}
                                placeholder="••••••••"
                            />
                        </Field>
                        <Field label="Confirm new password">
                            <input
                                className="account-input"
                                type="password"
                                value={confirmPwd}
                                onChange={(e) => setConfirmPwd(e.target.value)}
                                placeholder="••••••••"
                            />
                        </Field>
                        {pwdMessage && (
                            <div
                                className={`account-message account-message-${pwdMessage.type}`}
                            >
                                {pwdMessage.text}
                            </div>
                        )}
                        <div className="account-actions">
                            <ButtonCustom
                                type="standard"
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
                        <Field label="Preferred airport">
                            <input
                                className="account-input"
                                type="text"
                                value={preferredAirport}
                                onChange={(e) => setPreferredAirport(e.target.value)}
                                placeholder="e.g. JFK, SFO, LAX"
                            />
                        </Field>
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
                                type="standard"
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

interface FieldProps {
    label: string;
    children: React.ReactNode;
}

const Field = ({ label, children }: FieldProps) => (
    <label className="account-field">
        <span className="account-field-label">{label}</span>
        {children}
    </label>
);

interface ToggleProps {
    label: string;
    checked: boolean;
    onChange: (value: boolean) => void;
}

const Toggle = ({ label, checked, onChange }: ToggleProps) => (
    <label className="account-toggle">
        <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
        />
        <span className="account-toggle-track">
            <span className="account-toggle-thumb" />
        </span>
        <span className="account-toggle-label">{label}</span>
    </label>
);

export default Account;
