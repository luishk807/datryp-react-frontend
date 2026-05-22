import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import classnames from 'classnames';
import PersonOutlineRoundedIcon from '@mui/icons-material/PersonOutlineRounded';
import WorkspacePremiumRoundedIcon from '@mui/icons-material/WorkspacePremiumRounded';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import FlightTakeoffRoundedIcon from '@mui/icons-material/FlightTakeoffRounded';
import Layout from 'components/common/Layout/SubLayout';
import ButtonCustom from 'components/common/FormFields/ButtonCustom';
import InputField from 'components/common/FormFields/InputField';
import DropDown from 'components/common/FormFields/DropDown';
import SearchablePicker from 'components/common/FormFields/SearchablePicker';
import SubscriptionSection from './SubscriptionSection';
import { useUser } from 'context/UserContext';
import { useCountries } from 'api/hooks/useCountries';
import {
    useInterestsCatalog,
    useTravelerStylesCatalog,
    useUpdateMyPreferences,
} from 'api/hooks/useMyPreferences';
import {
    useRemoveProfileImage,
    useUploadProfileImage,
} from 'api/hooks/useProfileImage';
import PhotoCameraRoundedIcon from '@mui/icons-material/PhotoCameraRounded';
import { MAX_BIRTH_YEAR, MIN_BIRTH_YEAR } from 'utils/age';
import { BUTTON_VARIANT } from 'constants';
import './index.scss';

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
    const [birthYear, setBirthYear] = useState<number | ''>(user?.birthYear ?? '');
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

    // Travel preferences — interests, traveler styles, dream destinations.
    // Stored on the User row server-side; we seed local state from the
    // hydrated user and PATCH /me/preferences on save.
    const { data: interestCatalog = [] } = useInterestsCatalog();
    const { data: travelerStyleCatalog = [] } = useTravelerStylesCatalog();
    const updatePrefs = useUpdateMyPreferences();
    const [interests, setInterests] = useState<string[]>(user?.interests ?? []);
    const [travelerStyles, setTravelerStyles] = useState<string[]>(
        user?.travelerStyles ?? []
    );
    const [dreamDestinations, setDreamDestinations] = useState<string[]>(
        user?.dreamDestinations ?? []
    );
    const [travelPrefsMessage, setTravelPrefsMessage] = useState<{
        type: 'success' | 'error';
        text: string;
    } | null>(null);

    // Year-of-birth dropdown options, most-recent first (so a 30-year-old
    // doesn't have to scroll past 1900 to find their year).
    const yearOptions = useMemo(() => {
        const out: { id: number; name: string }[] = [];
        for (let y = MAX_BIRTH_YEAR; y >= MIN_BIRTH_YEAR; y--) {
            out.push({ id: y, name: String(y) });
        }
        return out;
    }, []);

    useEffect(() => {
        if (!user) return;
        setName(user.name);
        setEmail(user.email ?? '');
        setPhone(user.phone ?? '');
        setBirthYear(user.birthYear ?? '');
        setCountryOfBirth(user.countryOfBirth ?? '');
        setInterests(user.interests ?? []);
        setTravelerStyles(user.travelerStyles ?? []);
        setDreamDestinations(user.dreamDestinations ?? []);
    }, [user]);

    const interestOptions = useMemo(
        () => interestCatalog.map((o) => ({ value: o.slug, label: o.label })),
        [interestCatalog]
    );
    const travelerStyleOptions = useMemo(
        () =>
            travelerStyleCatalog.map((o) => ({
                value: o.slug,
                label: o.label,
            })),
        [travelerStyleCatalog]
    );
    const dreamDestinationOptions = useMemo(
        () => countries.map((c) => ({ value: c.code, label: c.name })),
        [countries]
    );

    const initial = useMemo(
        () => (user?.name ? user.name.charAt(0).toUpperCase() : '?'),
        [user]
    );

    // ---- Profile image ----
    const uploadProfileImage = useUploadProfileImage();
    const removeProfileImageMutation = useRemoveProfileImage();
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [imageError, setImageError] = useState<string | null>(null);

    const onPickFile = () => {
        if (uploadProfileImage.isPending) return;
        setImageError(null);
        fileInputRef.current?.click();
    };

    const onFileChosen = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        // Reset the input so picking the same file twice still fires
        // a change event (browsers de-dupe identical selections).
        e.target.value = '';
        if (!file) return;
        // 6 MB matches the backend ceiling — short-circuit so the user
        // gets immediate feedback instead of waiting for the request to
        // fail with a 413.
        if (file.size > 6 * 1024 * 1024) {
            setImageError('Image must be under 6 MB.');
            return;
        }
        uploadProfileImage.mutate(file, {
            onError: (err) =>
                setImageError(
                    err instanceof Error ? err.message : 'Upload failed.'
                ),
        });
    };

    const onRemoveImage = () => {
        if (removeProfileImageMutation.isPending) return;
        setImageError(null);
        removeProfileImageMutation.mutate(undefined, {
            onError: (err) =>
                setImageError(
                    err instanceof Error ? err.message : 'Could not remove.'
                ),
        });
    };

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
            birthYear: typeof birthYear === 'number' ? birthYear : undefined,
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

    const handleTravelPrefsSave = async () => {
        setTravelPrefsMessage(null);
        try {
            await updatePrefs.mutateAsync({
                interests,
                travelerStyles,
                dreamDestinations,
            });
            setTravelPrefsMessage({
                type: 'success',
                text: 'Travel preferences saved.',
            });
            setTimeout(() => setTravelPrefsMessage(null), 2500);
        } catch (err) {
            setTravelPrefsMessage({
                type: 'error',
                text:
                    err instanceof Error
                        ? err.message
                        : 'Could not save travel preferences.',
            });
        }
    };

    // Section nav — left-rail on desktop, sticky chip strip on mobile.
    // `id` matches the `<section id>` so clicking a link scrolls to the
    // section; the IntersectionObserver below tracks which section is
    // currently in view and highlights the matching nav item.
    const navSections = useMemo(
        () => [
            { id: 'profile', label: 'Profile', icon: PersonOutlineRoundedIcon },
            { id: 'subscription', label: 'Subscription', icon: WorkspacePremiumRoundedIcon },
            { id: 'password', label: 'Password', icon: LockOutlinedIcon },
            { id: 'travel-preferences', label: 'Travel preferences', icon: FlightTakeoffRoundedIcon },
        ],
        []
    );

    const [activeSection, setActiveSection] = useState<string>('profile');
    const mobileNavRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        // Track section visibility with IntersectionObserver. We bias the
        // root margin so a section is considered "active" once its header
        // is comfortably inside the viewport, not just clipping the top.
        const observed = navSections
            .map((s) => document.getElementById(s.id))
            .filter((el): el is HTMLElement => Boolean(el));
        if (observed.length === 0) return;

        const observer = new IntersectionObserver(
            (entries) => {
                // Pick the first entry that's currently intersecting — the
                // topmost visible section. Falls through gracefully on rapid
                // scrolls (we just keep the previous active item).
                const visible = entries
                    .filter((e) => e.isIntersecting)
                    .sort(
                        (a, b) =>
                            a.boundingClientRect.top - b.boundingClientRect.top
                    );
                if (visible.length > 0) {
                    setActiveSection(visible[0].target.id);
                }
            },
            {
                rootMargin: '-96px 0px -55% 0px',
                threshold: 0,
            }
        );

        observed.forEach((el) => observer.observe(el));
        return () => observer.disconnect();
    }, [navSections]);

    // Keep the active chip scrolled into view on mobile so a long nav
    // doesn't trap the active label off-screen.
    useEffect(() => {
        if (!mobileNavRef.current) return;
        const chip = mobileNavRef.current.querySelector<HTMLAnchorElement>(
            `[data-nav-id="${activeSection}"]`
        );
        chip?.scrollIntoView({
            behavior: 'smooth',
            inline: 'center',
            block: 'nearest',
        });
    }, [activeSection]);

    const handleNavClick = (
        e: React.MouseEvent<HTMLAnchorElement>,
        id: string
    ) => {
        // Imperative smooth-scroll instead of relying on the `:target`
        // fallback — gives us consistent behavior across click + back/
        // forward + hash mounts.
        e.preventDefault();
        const el = document.getElementById(id);
        if (!el) return;
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // Update the URL hash without forcing a re-render. Lets users
        // share a deep link to a specific section.
        window.history.replaceState(null, '', `#${id}`);
        setActiveSection(id);
    };

    return (
        <Layout title="Account">
            <div className="account-page">
                <nav className="account-nav" aria-label="Account sections">
                    <ul className="account-nav-list">
                        {navSections.map(({ id, label, icon: Icon }) => (
                            <li key={id}>
                                <a
                                    href={`#${id}`}
                                    data-nav-id={id}
                                    className={classnames('account-nav-link', {
                                        'is-active': activeSection === id,
                                    })}
                                    onClick={(e) => handleNavClick(e, id)}
                                >
                                    <Icon
                                        className="account-nav-icon"
                                        fontSize="small"
                                    />
                                    <span>{label}</span>
                                </a>
                            </li>
                        ))}
                    </ul>
                </nav>

                <div
                    className="account-nav-mobile"
                    role="tablist"
                    aria-label="Account sections"
                    ref={mobileNavRef}
                >
                    {navSections.map(({ id, label, icon: Icon }) => (
                        <a
                            key={id}
                            href={`#${id}`}
                            data-nav-id={id}
                            role="tab"
                            aria-selected={activeSection === id}
                            className={classnames('account-nav-chip', {
                                'is-active': activeSection === id,
                            })}
                            onClick={(e) => handleNavClick(e, id)}
                        >
                            <Icon
                                className="account-nav-chip-icon"
                                fontSize="small"
                            />
                            <span>{label}</span>
                        </a>
                    ))}
                </div>

                <div className="account-content">
                {/* Profile */}
                <section className="account-card" id="profile">
                    <div className="account-card-header">
                        <div className="account-avatar-wrap">
                            <button
                                type="button"
                                className="account-avatar"
                                onClick={onPickFile}
                                disabled={uploadProfileImage.isPending}
                                aria-label={
                                    user.profileImageUrl
                                        ? 'Change profile picture'
                                        : 'Upload a profile picture'
                                }
                            >
                                {user.profileImageUrl ? (
                                    <img
                                        src={user.profileImageUrl}
                                        alt=""
                                        className="account-avatar-img"
                                    />
                                ) : (
                                    <span className="account-avatar-initial">
                                        {initial}
                                    </span>
                                )}
                                <span className="account-avatar-overlay">
                                    <PhotoCameraRoundedIcon fontSize="small" />
                                </span>
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                className="account-avatar-file"
                                onChange={onFileChosen}
                            />
                        </div>
                        <div className="account-card-headings">
                            <h2 className="account-card-title">Profile</h2>
                            <p className="account-card-subtitle">
                                Manage how your name, email and phone appear.
                            </p>
                            <div className="account-avatar-actions">
                                <button
                                    type="button"
                                    className="account-avatar-link"
                                    onClick={onPickFile}
                                    disabled={uploadProfileImage.isPending}
                                >
                                    {uploadProfileImage.isPending
                                        ? 'Uploading…'
                                        : user.profileImageUrl
                                            ? 'Change picture'
                                            : 'Upload picture'}
                                </button>
                                {user.profileImageUrl && (
                                    <button
                                        type="button"
                                        className="account-avatar-link is-destructive"
                                        onClick={onRemoveImage}
                                        disabled={
                                            removeProfileImageMutation.isPending
                                        }
                                    >
                                        {removeProfileImageMutation.isPending
                                            ? 'Removing…'
                                            : 'Remove'}
                                    </button>
                                )}
                            </div>
                            {imageError && (
                                <p
                                    className="account-avatar-error"
                                    role="alert"
                                >
                                    {imageError}
                                </p>
                            )}
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
                        <DropDown
                            variant="bare"
                            label="Year of birth"
                            options={yearOptions}
                            valueKey="id"
                            value={birthYear === '' ? null : birthYear}
                            placeholder="Select a year"
                            onChange={(opt) =>
                                setBirthYear(
                                    opt && typeof opt.id === 'number'
                                        ? opt.id
                                        : ''
                                )
                            }
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
                <section className="account-card" id="password">
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

                {/* Travel preferences — drives the personalized "Places you might
                    love" homepage recommender. Same fields the signup wizard
                    collects on Step 6. */}
                <section className="account-card" id="travel-preferences">
                    <div className="account-card-headings simple">
                        <h2 className="account-card-title">Travel preferences</h2>
                        <p className="account-card-subtitle">
                            We use these to suggest places you might love.
                        </p>
                    </div>
                    <div className="account-form account-travel-prefs">
                        <SearchablePicker
                            label="Interests"
                            options={interestOptions}
                            value={interests}
                            onChange={setInterests}
                            placeholder="Search interests…"
                            maxSelected={8}
                            helperText="Pick up to 8."
                        />
                        <SearchablePicker
                            label="What kind of traveler are you?"
                            options={travelerStyleOptions}
                            value={travelerStyles}
                            onChange={setTravelerStyles}
                            placeholder="Search traveler styles…"
                            maxSelected={4}
                            helperText="Pick up to 4."
                        />
                        <SearchablePicker
                            label="Places you'd like to visit"
                            options={dreamDestinationOptions}
                            value={dreamDestinations}
                            onChange={setDreamDestinations}
                            placeholder={
                                countriesLoading
                                    ? 'Loading countries…'
                                    : 'Search countries…'
                            }
                            disabled={countriesLoading}
                            maxSelected={8}
                            helperText="Pick up to 8 countries."
                        />
                        {travelPrefsMessage && (
                            <div
                                className={`account-message account-message-${travelPrefsMessage.type}`}
                            >
                                {travelPrefsMessage.text}
                            </div>
                        )}
                        <div className="account-actions">
                            <ButtonCustom
                                type={BUTTON_VARIANT.STANDARD_MINI}
                                capitalizeType="uppercase"
                                label={
                                    updatePrefs.isPending
                                        ? 'Saving…'
                                        : 'Save travel preferences'
                                }
                                onClick={handleTravelPrefsSave}
                                disabled={updatePrefs.isPending}
                            />
                        </div>
                    </div>
                </section>

                </div>{/* /.account-content */}
            </div>
        </Layout>
    );
};


export default Account;
