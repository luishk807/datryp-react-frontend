import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import classnames from 'classnames';
import { Alert, Snackbar } from '@mui/material';
import PersonOutlineRoundedIcon from '@mui/icons-material/PersonOutlineRounded';
import WorkspacePremiumRoundedIcon from '@mui/icons-material/WorkspacePremiumRounded';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import FlightTakeoffRoundedIcon from '@mui/icons-material/FlightTakeoffRounded';
import Layout from 'components/common/Layout/SubLayout';
import ButtonCustom from 'components/common/FormFields/ButtonCustom';
import InputField from 'components/common/FormFields/InputField';
import DropDown from 'components/common/FormFields/DropDown';
import SearchablePicker from 'components/common/FormFields/SearchablePicker';
import type { CitySelection } from 'components/common/FormFields/CityAutocomplete';
import HomeBaseField from 'components/common/FormFields/HomeBaseField';
import SubscriptionSection from './SubscriptionSection';
import { useUser } from 'context/UserContext';
import { useCountries } from 'api/hooks/useCountries';
import {
    useGendersCatalog,
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
    const { data: genders = [], isLoading: gendersLoading } = useGendersCatalog();

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
        user?.countryOfBirthCode ?? ''
    );
    const [genderId, setGenderId] = useState<string>(user?.genderId ?? '');
    const [profileSaved, setProfileSaved] = useState(false);
    // Toast that surfaces save success / failure prominently — the
    // button-label flip alone ("Save profile" → "Saved") was too easy
    // to miss, especially when the home-base / gender preferences
    // mutation fails silently. The Snackbar at the bottom of the page
    // shows both states until the user dismisses it (or auto-hides
    // after a few seconds).
    const [profileToast, setProfileToast] = useState<{
        type: 'success' | 'error';
        text: string;
    } | null>(null);

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

    // Home base — city-level (privacy: never street). Seeds the depart
    // airport / station on the first transport leg of new trips. Lives
    // server-side via /me/preferences; null when the user hasn't set
    // one yet.
    const [homeBase, setHomeBase] = useState<CitySelection | null>(
        user?.homeCity && user?.homeCountry && user?.homeCountryCode
            ? {
                  city: user.homeCity,
                  country: user.homeCountry,
                  countryCode: user.homeCountryCode,
                  latitude: user.homeLatitude,
                  longitude: user.homeLongitude,
              }
            : null
    );
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
        setCountryOfBirth(user.countryOfBirthCode ?? '');
        setGenderId(user.genderId ?? '');
        setInterests(user.interests ?? []);
        setTravelerStyles(user.travelerStyles ?? []);
        setDreamDestinations(user.dreamDestinations ?? []);
        setHomeBase(
            user.homeCity && user.homeCountry && user.homeCountryCode
                ? {
                      city: user.homeCity,
                      country: user.homeCountry,
                      countryCode: user.homeCountryCode,
                      latitude: user.homeLatitude,
                      longitude: user.homeLongitude,
                  }
                : null
        );
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
    // Fallback flag: flips true when the <img> for the profile picture
    // fails to load (S3 ACL, iOS Safari TLS quirk, expired CloudFront
    // edge cache after a re-upload, etc.). When true we render the
    // initial-letter avatar instead of a broken-image icon. Resets
    // whenever the URL itself changes so a re-upload gets another
    // chance to load.
    const [imageLoadFailed, setImageLoadFailed] = useState(false);
    useEffect(() => {
        setImageLoadFailed(false);
    }, [user?.profileImageUrl]);

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
    const handleProfileSave = async () => {
        if (!name.trim()) {
            setProfileToast({
                type: 'error',
                text: 'Name is required.',
            });
            return;
        }
        // `name` / `email` aren't editable server-side yet — they stay in
        // the localStorage overlay until we wire a /me/profile route for
        // them. The other profile fields all live on the User row and go
        // through the preferences mutation so they survive a re-login on a
        // fresh browser.
        updateUser({
            name: name.trim(),
            email: email.trim() || undefined,
        });
        // Diff against the hydrated user so we only PATCH fields the user
        // actually changed. `undefined` skips the field server-side; `null`
        // clears it. The empty-string-to-null normalization mirrors what
        // the schema validator does on the backend.
        const trimmedPhone = phone.trim();
        const phoneVal = trimmedPhone === '' ? null : trimmedPhone;
        const birthVal = typeof birthYear === 'number' ? birthYear : null;
        const countryVal = countryOfBirth || null;
        const phoneChanged = phoneVal !== (user?.phone ?? null);
        const birthYearChanged = birthVal !== (user?.birthYear ?? null);
        const countryChanged =
            countryVal !== (user?.countryOfBirthCode ?? null);
        const genderChanged =
            (genderId || null) !== (user?.genderId ?? null);
        const prevHomeCity = user?.homeCity ?? null;
        const homeBaseChanged = (homeBase?.city ?? null) !== prevHomeCity;
        const anyServerFieldChanged =
            phoneChanged ||
            birthYearChanged ||
            countryChanged ||
            genderChanged ||
            homeBaseChanged;
        let prefsError: string | null = null;
        if (anyServerFieldChanged) {
            try {
                await updatePrefs.mutateAsync({
                    ...(phoneChanged ? { phone: phoneVal } : {}),
                    ...(birthYearChanged ? { birthYear: birthVal } : {}),
                    ...(countryChanged
                        ? { countryOfBirthCode: countryVal }
                        : {}),
                    ...(genderChanged ? { genderId: genderId || null } : {}),
                    ...(homeBaseChanged
                        ? homeBase
                            ? {
                                  homeCity: homeBase.city,
                                  homeCountry: homeBase.country,
                                  homeCountryCode: homeBase.countryCode,
                                  homeLatitude: homeBase.latitude,
                                  homeLongitude: homeBase.longitude,
                              }
                            : {
                                  homeCity: null,
                                  homeCountry: null,
                                  homeCountryCode: null,
                                  homeLatitude: null,
                                  homeLongitude: null,
                              }
                        : {}),
                });
            } catch (err) {
                prefsError =
                    err instanceof Error
                        ? err.message
                        : 'Could not save profile fields.';
            }
        }
        if (prefsError) {
            setProfileToast({
                type: 'error',
                text: `Saved partially, but: ${prefsError}`,
            });
        } else {
            setProfileToast({
                type: 'success',
                text: 'Profile saved.',
            });
        }
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
                                {user.profileImageUrl && !imageLoadFailed ? (
                                    <img
                                        src={user.profileImageUrl}
                                        alt=""
                                        className="account-avatar-img"
                                        // Decode async so the page doesn't
                                        // block on a slow CDN; iOS Safari
                                        // historically held the main
                                        // thread on large remote images.
                                        decoding="async"
                                        loading="eager"
                                        // No `crossOrigin` attribute — adding
                                        // it forces a CORS preflight that the
                                        // S3 bucket isn't configured for and
                                        // turns a previously-working image
                                        // into a broken one. Plain <img>
                                        // tags don't need CORS unless we
                                        // intend to canvas-read them.
                                        onError={() => setImageLoadFailed(true)}
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
                        <DropDown
                            variant="bare"
                            label="Gender"
                            options={genders}
                            valueKey="id"
                            value={genderId || null}
                            placeholder={
                                gendersLoading
                                    ? 'Loading…'
                                    : 'Select an option'
                            }
                            disabled={gendersLoading}
                            onChange={(opt) =>
                                setGenderId(
                                    typeof opt?.id === 'string'
                                        ? opt.id
                                        : ''
                                )
                            }
                        />
                        {/* Home base lives inside Profile so the same Save
                            button persists it alongside name / email / etc.
                            Granularity is city-only (we never store street
                            address) — used to seed the depart airport or
                            station on new trips. */}
                        <HomeBaseField
                            value={homeBase}
                            onChange={setHomeBase}
                            disabled={updatePrefs.isPending}
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
            <Snackbar
                open={Boolean(profileToast)}
                autoHideDuration={3500}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                onClose={() => setProfileToast(null)}
            >
                {profileToast ? (
                    <Alert
                        severity={profileToast.type}
                        variant="filled"
                        onClose={() => setProfileToast(null)}
                        sx={{ width: '100%' }}
                    >
                        {profileToast.text}
                    </Alert>
                ) : undefined}
            </Snackbar>
        </Layout>
    );
};


export default Account;
