import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import classnames from 'classnames';
import { Alert, Snackbar } from '@mui/material';
import PersonOutlineRoundedIcon from '@mui/icons-material/PersonOutlineRounded';
import WorkspacePremiumRoundedIcon from '@mui/icons-material/WorkspacePremiumRounded';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import FlightTakeoffRoundedIcon from '@mui/icons-material/FlightTakeoffRounded';
import NotificationsNoneRoundedIcon from '@mui/icons-material/NotificationsNoneRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import Layout from 'components/common/Layout/SubLayout';
import ButtonCustom from 'components/common/FormFields/ButtonCustom';
import ModalButton, {
    type ModalButtonHandle,
} from 'components/ModalButton';
import Toggle from 'components/common/FormFields/Toggle';
import CheckBoxCustom from 'components/common/FormFields/CheckBoxCustom';
import InputField from 'components/common/FormFields/InputField';
import PhoneInput from 'components/common/FormFields/PhoneInput';
import DropDown from 'components/common/FormFields/DropDown';
import SearchablePicker from 'components/common/FormFields/SearchablePicker';
import {
    KIDS_AGE_BUCKETS,
    TRAVEL_COMPANIONS,
    shouldShowKidsAgePicker,
} from 'constants/travelCompanions';
import type { CitySelection } from 'components/common/FormFields/CityAutocomplete';
import HomeBaseField from 'components/common/FormFields/HomeBaseField';
import SubscriptionSection from './SubscriptionSection';
import { useUser } from 'context/UserContext';
import { useDeleteAccount } from 'api/hooks/useDeleteAccount';
import { useCountries } from 'api/hooks/useCountries';
import {
    useGendersCatalog,
    useInterestsCatalog,
    useMyPreferences,
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
    const { user, isAdmin, updateUser, logout } = useUser();
    const navigate = useNavigate();
    // SMS notifications are a Pro perk (they cost per message). Admins get
    // the same bypass they get on every other paywall.
    const isPro = Boolean(user && (user.isPaidMember || isAdmin));
    const { hash } = useLocation();
    const { data: rawCountries = [], isLoading: countriesLoading } = useCountries('', {
        limit: 300,
    });
    // Move the user's likely country to the top of the picker. Preference
    // order: backend-detected (per-request edge geo) → already-set home
    // country. Either signal pinpoints the country far better than
    // alphabetical scroll, and the rest of the list stays in its
    // catalog order so an unfamiliar user can still scan A-Z.
    const countries = useMemo(() => {
        const hint =
            user?.detectedCountryCode || user?.homeCountryCode || null;
        if (!hint || rawCountries.length === 0) return rawCountries;
        const hi = hint.toUpperCase();
        const idx = rawCountries.findIndex(
            (c) => (c.code ?? '').toUpperCase() === hi,
        );
        if (idx <= 0) return rawCountries;
        const next = [...rawCountries];
        const [picked] = next.splice(idx, 1);
        return [picked, ...next];
    }, [rawCountries, user?.detectedCountryCode, user?.homeCountryCode]);
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
    // `/auth/me` doesn't embed the per-channel notification prefs on the
    // UserContext user object, so we seed those two toggles from the
    // standalone `/me/preferences` query instead of `user`.
    const { data: preferences } = useMyPreferences();
    const updatePrefs = useUpdateMyPreferences();
    const [interests, setInterests] = useState<string[]>(user?.interests ?? []);
    const [travelerStyles, setTravelerStyles] = useState<string[]>(
        user?.travelerStyles ?? []
    );
    const [dreamDestinations, setDreamDestinations] = useState<string[]>(
        user?.dreamDestinations ?? []
    );
    // OPT-IN travel companions + kids age buckets. Both default empty;
    // see [src/constants/travelCompanions.ts] for the catalog and the
    // privacy posture (coarse buckets only, no exact ages, no names).
    const [travelCompanions, setTravelCompanions] = useState<string[]>(
        user?.travelCompanions ?? []
    );
    const [kidsAgeBuckets, setKidsAgeBuckets] = useState<string[]>(
        user?.kidsAgeBuckets ?? []
    );
    const [travelPrefsMessage, setTravelPrefsMessage] = useState<{
        type: 'success' | 'error';
        text: string;
    } | null>(null);

    // Per-channel notification preferences. In-app alerts are always on
    // (no toggle); email defaults on, SMS is opt-in and only effective
    // when a phone number is also set. Seeded from `/me/preferences`
    // since these aren't embedded on the UserContext user.
    const [notifyEmail, setNotifyEmail] = useState(true);
    const [notifySms, setNotifySms] = useState(false);
    // Explicit SMS opt-in consent (A2P 10DLC / Twilio requirement). The
    // toggle can't be turned on until this is checked, and unchecking it
    // revokes SMS. Seeded true for users who already had SMS on — they
    // opted in previously, so we don't force a re-consent on them.
    const [smsConsent, setSmsConsent] = useState(false);
    const [notifyMessage, setNotifyMessage] = useState<{
        type: 'success' | 'error';
        text: string;
    } | null>(null);

    // Privacy — visited-history sharing. OFF by default; when on, friends
    // see your visits on destination pages + the Atlas. Seeded from
    // `/me/preferences` like the notification toggles.
    const [shareVisitedPlaces, setShareVisitedPlaces] = useState(false);
    const [privacyMessage, setPrivacyMessage] = useState<{
        type: 'success' | 'error';
        text: string;
    } | null>(null);

    // Danger zone — self-service account deletion. The confirm modal is
    // ref-controlled; the user must type DELETE (exact, case-sensitive)
    // before the destructive button enables.
    const deleteModalRef = useRef<ModalButtonHandle>(null);
    const deleteAccount = useDeleteAccount();
    const [deleteConfirmText, setDeleteConfirmText] = useState('');
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const canConfirmDelete = deleteConfirmText === 'DELETE';

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
        setTravelCompanions(user.travelCompanions ?? []);
        setKidsAgeBuckets(user.kidsAgeBuckets ?? []);
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

    useEffect(() => {
        if (!preferences) return;
        setNotifyEmail(preferences.notifyEmail ?? true);
        setNotifySms(preferences.notifySms ?? false);
        setSmsConsent(preferences.notifySms ?? false);
        setShareVisitedPlaces(preferences.shareVisitedPlaces ?? false);
    }, [preferences]);

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
        // `name` isn't editable server-side yet — it stays in the
        // localStorage overlay until we wire a /me/profile route. Email is
        // intentionally NOT updatable (read-only field above): it's the
        // login identity + reset/notification destination, so changing it
        // needs a real re-verify flow, not a silent overlay write.
        updateUser({
            name: name.trim(),
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
        // If the user has un-picked "family_kids" we proactively clear
        // the age-bucket selection so we never persist orphan kid
        // buckets without the parent flag. Keeps the AI prompt clean
        // and the privacy footprint minimal.
        const effectiveKidsBuckets = travelCompanions.includes('family_kids')
            ? kidsAgeBuckets
            : [];
        try {
            await updatePrefs.mutateAsync({
                interests,
                travelerStyles,
                dreamDestinations,
                travelCompanions,
                kidsAgeBuckets: effectiveKidsBuckets,
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

    // SMS opt-in is gated on explicit consent. Turning the toggle on
    // without the consent box checked is blocked with a nudge; turning it
    // off is always allowed.
    const handleSmsToggle = (next: boolean) => {
        if (next && !smsConsent) {
            setNotifyMessage({
                type: 'error',
                text: 'Please check the SMS consent box below to receive text alerts.',
            });
            return;
        }
        setNotifyMessage(null);
        setNotifySms(next);
    };

    // Unchecking consent revokes SMS — you can't be opted in without it.
    const handleSmsConsentToggle = () => {
        setSmsConsent((prev) => {
            const next = !prev;
            if (!next) setNotifySms(false);
            return next;
        });
    };

    const handleNotificationsSave = async () => {
        setNotifyMessage(null);
        try {
            // Non-Pro users can't have SMS on — force false so a stale
            // opt-in (e.g. after a downgrade) doesn't trip the backend's
            // Pro guard and block the whole save. SMS also stays off
            // without explicit consent, even for Pro.
            await updatePrefs.mutateAsync({
                notifyEmail,
                notifySms: isPro && smsConsent ? notifySms : false,
            });
            setNotifyMessage({
                type: 'success',
                text: 'Notification settings saved.',
            });
            setTimeout(() => setNotifyMessage(null), 2500);
        } catch (err) {
            setNotifyMessage({
                type: 'error',
                text:
                    err instanceof Error
                        ? err.message
                        : 'Could not save notification settings.',
            });
        }
    };

    const handlePrivacySave = async () => {
        setPrivacyMessage(null);
        try {
            await updatePrefs.mutateAsync({ shareVisitedPlaces });
            setPrivacyMessage({
                type: 'success',
                text: 'Privacy settings saved.',
            });
            setTimeout(() => setPrivacyMessage(null), 2500);
        } catch (err) {
            setPrivacyMessage({
                type: 'error',
                text:
                    err instanceof Error
                        ? err.message
                        : 'Could not save privacy settings.',
            });
        }
    };

    const handleDeleteAccount = async () => {
        if (!canConfirmDelete || deleteAccount.isPending) return;
        setDeleteError(null);
        try {
            await deleteAccount.mutateAsync();
            // Tear down the session locally, then leave the page. No success
            // toast — we're navigating away from a now-deleted account.
            logout();
            navigate('/');
        } catch (err) {
            setDeleteError(
                err instanceof Error
                    ? err.message
                    : 'Could not delete your account. Please try again.'
            );
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
            { id: 'notifications', label: 'Notifications', icon: NotificationsNoneRoundedIcon },
            { id: 'danger-zone', label: 'Delete account', icon: WarningAmberRoundedIcon },
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
                        {/* Email is the login identity + notification and
                            password-reset destination, so it's read-only here.
                            Changing it needs a proper re-verify flow (and a
                            Stripe customer update); not self-service. */}
                        <InputField
                            variant="bare"
                            label="Email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            required={false}
                            disabled
                        />
                        <PhoneInput
                            label="Phone"
                            value={phone}
                            onChange={setPhone}
                            placeholder="(555) 123-4567"
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
                        {/* OPT-IN travel companions. Helps the AI bias picks
                          * (Disney + toddler picks for "family with kids",
                          * couple-style activities for "couple", etc).
                          * Coarse buckets only — see our Privacy Policy for
                          * what we collect and why. */}
                        <SearchablePicker
                            label="Who do you usually travel with?"
                            options={TRAVEL_COMPANIONS.map((c) => ({
                                value: c.slug,
                                label: c.label,
                            }))}
                            value={travelCompanions}
                            onChange={setTravelCompanions}
                            placeholder="Pick any that apply…"
                            helperText="Optional. We use this to bias trip suggestions."
                        />
                        {shouldShowKidsAgePicker(travelCompanions) && (
                            <SearchablePicker
                                label="Kids' age ranges"
                                options={KIDS_AGE_BUCKETS.map((b) => ({
                                    value: b.slug,
                                    label: b.label,
                                }))}
                                value={kidsAgeBuckets}
                                onChange={setKidsAgeBuckets}
                                placeholder="Pick any that apply…"
                                helperText="Optional. Coarse ranges only — we don't store exact ages or names."
                            />
                        )}
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

                {/* Notifications — per-channel delivery preferences. In-app
                    alerts are always on; these two toggles control the email
                    and SMS fan-out the backend applies to trip + activity
                    notifications. */}
                <section className="account-card" id="notifications">
                    <div className="account-card-headings simple">
                        <h2 className="account-card-title">Notifications</h2>
                        <p className="account-card-subtitle">
                            Choose how we reach you about trips and activities.
                            In-app alerts are always on.
                        </p>
                    </div>
                    <div className="account-form account-notifications">
                        <div className="account-notify-row">
                            <Toggle
                                label="Email notifications"
                                description="Trip invites, status changes, and activity alerts by email."
                                checked={notifyEmail}
                                onChange={setNotifyEmail}
                                disabled={updatePrefs.isPending}
                            />
                        </div>
                        <div className="account-notify-row">
                            <Toggle
                                label="SMS notifications (Pro)"
                                description="Text alerts for time-sensitive trip updates."
                                checked={isPro && notifySms}
                                onChange={handleSmsToggle}
                                disabled={updatePrefs.isPending || !isPro}
                            />
                            {!isPro && (
                                <p className="account-notify-helper">
                                    SMS alerts are a Pro feature.{' '}
                                    <Link to="/membership">Upgrade to Pro</Link>{' '}
                                    to enable texts.
                                </p>
                            )}
                            {isPro && !phone.trim() && (
                                <p className="account-notify-helper">
                                    Add a phone number in your Profile above to
                                    receive texts.
                                </p>
                            )}
                            {/* Explicit A2P 10DLC / Twilio opt-in consent.
                                Required for SMS to be enabled — the toggle is
                                gated on this box. The label carries the full
                                mandated disclosure (program, frequency, rates,
                                STOP/HELP). */}
                            {isPro && (
                                <div className="account-sms-consent">
                                    <CheckBoxCustom
                                        label="I agree to receive SMS text messages from DaTryp. Message frequency varies. Message and data rates may apply. Reply STOP to opt out and HELP for help."
                                        defaultCheck={smsConsent}
                                        onClick={handleSmsConsentToggle}
                                    />
                                    <p className="account-notify-helper">
                                        See our{' '}
                                        <Link to="/sms">SMS Messaging Policy</Link>,{' '}
                                        <Link to="/terms">Terms</Link>, and{' '}
                                        <Link to="/privacy">Privacy Policy</Link>.
                                    </p>
                                </div>
                            )}
                        </div>
                        {notifyMessage && (
                            <div
                                className={`account-message account-message-${notifyMessage.type}`}
                            >
                                {notifyMessage.text}
                            </div>
                        )}
                        <div className="account-actions">
                            <ButtonCustom
                                type={BUTTON_VARIANT.STANDARD_MINI}
                                capitalizeType="uppercase"
                                label={
                                    updatePrefs.isPending
                                        ? 'Saving…'
                                        : 'Save notifications'
                                }
                                onClick={handleNotificationsSave}
                                disabled={updatePrefs.isPending}
                            />
                        </div>
                    </div>
                </section>

                {/* Privacy — visited-history sharing. Off by default; turning
                    it on lets friends see where you've been on destination
                    pages and the Travel Atlas. */}
                <section className="account-card" id="privacy">
                    <div className="account-card-headings simple">
                        <h2 className="account-card-title">Privacy</h2>
                        <p className="account-card-subtitle">
                            Control what your friends can see about where
                            you&rsquo;ve travelled.
                        </p>
                    </div>
                    <div className="account-form account-notifications">
                        <div className="account-notify-row">
                            <Toggle
                                label="Share visited places with friends"
                                description="When on, friends see the places, cities, and countries you've visited — on destination pages (“Visited by…”) and your Travel Atlas. Off keeps your travel history private to you."
                                checked={shareVisitedPlaces}
                                onChange={setShareVisitedPlaces}
                                disabled={updatePrefs.isPending}
                            />
                        </div>
                        {privacyMessage && (
                            <div
                                className={`account-message account-message-${privacyMessage.type}`}
                            >
                                {privacyMessage.text}
                            </div>
                        )}
                        <div className="account-actions">
                            <ButtonCustom
                                type={BUTTON_VARIANT.STANDARD_MINI}
                                capitalizeType="uppercase"
                                label={
                                    updatePrefs.isPending
                                        ? 'Saving…'
                                        : 'Save privacy'
                                }
                                onClick={handlePrivacySave}
                                disabled={updatePrefs.isPending}
                            />
                        </div>
                    </div>
                </section>

                {/* Danger zone — irreversible account deletion. Gated behind a
                    typed-confirmation modal so it can't be triggered by a stray
                    click. On success we log out + redirect home. */}
                <section
                    className="account-card account-danger"
                    id="danger-zone"
                >
                    <div className="account-card-headings simple">
                        <h2 className="account-card-title">Delete account</h2>
                        <p className="account-card-subtitle">
                            Permanently close your account. This cancels any
                            active subscription and signs you out. Trips you
                            organize remain for the other participants, but
                            you'll lose access to them — and you can't undo this
                            yourself.
                        </p>
                    </div>
                    <div className="account-actions">
                        <ButtonCustom
                            type={BUTTON_VARIANT.STANDARD_MINI}
                            capitalizeType="none"
                            className="account-danger-btn"
                            label="Delete my account"
                            onClick={() => {
                                setDeleteConfirmText('');
                                setDeleteError(null);
                                deleteModalRef.current?.openModel();
                            }}
                        />
                    </div>
                    <ModalButton
                        ref={deleteModalRef}
                        title="Delete account"
                        onClose={() => {
                            setDeleteConfirmText('');
                            setDeleteError(null);
                        }}
                    >
                        <div className="account-delete-modal">
                            <p className="account-delete-warning">
                                This is permanent and can't be undone. When you
                                delete your account:
                            </p>
                            <ul className="account-delete-list">
                                <li>Your account is closed.</li>
                                <li>Any active subscription is cancelled.</li>
                                <li>
                                    Trips you organize remain for the other
                                    participants, but you'll lose access to them.
                                </li>
                                <li>You'll be signed out right away.</li>
                            </ul>
                            <InputField
                                variant="bare"
                                label="Type DELETE to confirm"
                                type="text"
                                value={deleteConfirmText}
                                onChange={(e) =>
                                    setDeleteConfirmText(e.target.value)
                                }
                                placeholder="DELETE"
                                required={false}
                            />
                            {deleteError && (
                                <div className="account-message account-message-error">
                                    {deleteError}
                                </div>
                            )}
                            <div className="account-delete-actions">
                                <ButtonCustom
                                    type={BUTTON_VARIANT.TEXT}
                                    capitalizeType="none"
                                    label="Cancel"
                                    disabled={deleteAccount.isPending}
                                    onClick={() =>
                                        deleteModalRef.current?.closeModal()
                                    }
                                />
                                <ButtonCustom
                                    type={BUTTON_VARIANT.STANDARD_MINI}
                                    capitalizeType="none"
                                    className="account-danger-btn"
                                    label={
                                        deleteAccount.isPending
                                            ? 'Deleting…'
                                            : 'Delete my account'
                                    }
                                    disabled={
                                        !canConfirmDelete ||
                                        deleteAccount.isPending
                                    }
                                    onClick={handleDeleteAccount}
                                />
                            </div>
                        </div>
                    </ModalButton>
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
