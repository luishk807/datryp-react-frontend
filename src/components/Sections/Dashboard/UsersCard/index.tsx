import { useMemo, useState } from 'react';
import './index.scss';
import {
    IconButton,
    Menu,
    MenuItem,
    Snackbar,
} from '@mui/material';
import MoreVertRoundedIcon from '@mui/icons-material/MoreVertRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import PersonAddRoundedIcon from '@mui/icons-material/PersonAddRounded';
import classnames from 'classnames';
import {
    useAdminAgeDistribution,
    useAdminGrowth,
    useAdminSubscriptionStats,
    useAdminUsers,
    useAdminUsersByGender,
    useSetUserFree,
    useSetUserPro,
    useSetUserRole,
    useSoftDeleteUser,
} from 'api/hooks/useAdmin';
import { useUser } from 'context/UserContext';
import { formatDate } from 'utils/date';
import InputField from 'components/common/FormFields/InputField';
import LineChart from '../LineChart';
import PieChart from '../PieChart';
import { USER_ROLE } from 'constants';
import type { AdminUser } from 'types';
import CreateUserModal from './CreateUserModal';

const MONTH_LABELS = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
];

const formatMonth = (key: string): string => {
    const [yearStr, monthStr] = key.split('-');
    const m = Number(monthStr);
    if (Number.isNaN(m) || m < 1 || m > 12) return key;
    return `${MONTH_LABELS[m - 1]} ${yearStr.slice(2)}`;
};

const PLAN_LABEL: Record<string, string> = {
    free: 'Free',
    pro: 'Pro',
    premium: 'Premium',
};

const PLAN_COLORS: Record<string, string> = {
    free: '#9aa0a6',
    pro: '#228b22',
    premium: '#3a86ff',
};

const formatDateOrDash = (iso: string | null): string =>
    iso ? formatDate(iso, 'MMM D, YYYY') : '—';

interface RowMenuProps {
    target: AdminUser;
    /** Currently-signed-in admin's UUID. Drives the self-action guards in
     *  the menu so the user can't fat-finger a self-demote / self-delete
     *  that the backend would reject anyway. */
    actorId: string;
}

const RowMenu = ({ target, actorId }: RowMenuProps) => {
    const [anchor, setAnchor] = useState<HTMLElement | null>(null);
    const [toast, setToast] = useState<string | null>(null);
    const [confirm, setConfirm] = useState<
        null | 'promote' | 'demote' | 'pro' | 'free' | 'delete'
    >(null);

    const setRole = useSetUserRole();
    const setPro = useSetUserPro();
    const setFree = useSetUserFree();
    const softDelete = useSoftDeleteUser();

    const isSelf = target.id === actorId;
    const isAdmin = target.role === USER_ROLE.ADMIN;

    const close = () => setAnchor(null);

    const ack = (msg: string) => (err: unknown) => {
        if (err instanceof Error) setToast(err.message);
        else setToast(msg);
    };

    const handleConfirm = () => {
        switch (confirm) {
            case 'promote':
                setRole.mutate(
                    { id: target.id, role: USER_ROLE.ADMIN },
                    {
                        onSuccess: () => setToast(`${target.email} promoted to admin`),
                        onError: ack('promote failed'),
                    }
                );
                break;
            case 'demote':
                setRole.mutate(
                    { id: target.id, role: USER_ROLE.USER },
                    {
                        onSuccess: () => setToast(`${target.email} demoted to user`),
                        onError: ack('demote failed'),
                    }
                );
                break;
            case 'pro':
                setPro.mutate(target.id, {
                    onSuccess: () => setToast(`${target.email} set to Pro`),
                    onError: ack('set pro failed'),
                });
                break;
            case 'free':
                setFree.mutate(target.id, {
                    onSuccess: () => setToast(`${target.email} set to Free`),
                    onError: ack('set free failed'),
                });
                break;
            case 'delete':
                softDelete.mutate(target.id, {
                    onSuccess: () => setToast(`${target.email} deleted`),
                    onError: ack('delete failed'),
                });
                break;
        }
        setConfirm(null);
    };

    return (
        <>
            <IconButton
                size="small"
                onClick={(e) => setAnchor(e.currentTarget)}
                aria-label={`Actions for ${target.email}`}
            >
                <MoreVertRoundedIcon fontSize="small" />
            </IconButton>
            <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={close}>
                <MenuItem
                    disabled={target.subscriptionPlan === 'pro'}
                    onClick={() => {
                        setConfirm('pro');
                        close();
                    }}
                >
                    Set Pro (30d)
                </MenuItem>
                <MenuItem
                    disabled={target.subscriptionPlan === 'free'}
                    onClick={() => {
                        setConfirm('free');
                        close();
                    }}
                >
                    Set Free
                </MenuItem>
                {!isAdmin && (
                    <MenuItem
                        onClick={() => {
                            setConfirm('promote');
                            close();
                        }}
                    >
                        Promote to admin
                    </MenuItem>
                )}
                {isAdmin && (
                    <MenuItem
                        disabled={isSelf}
                        onClick={() => {
                            setConfirm('demote');
                            close();
                        }}
                    >
                        Demote to user
                    </MenuItem>
                )}
                <MenuItem
                    disabled={isSelf}
                    className="users-card-danger"
                    onClick={() => {
                        setConfirm('delete');
                        close();
                    }}
                >
                    Soft-delete
                </MenuItem>
            </Menu>

            {confirm && (
                <ConfirmInline
                    label={
                        confirm === 'delete'
                            ? `Soft-delete ${target.email}? They won't be able to log in.`
                            : confirm === 'promote'
                                ? `Promote ${target.email} to admin?`
                                : confirm === 'demote'
                                    ? `Demote ${target.email} to user?`
                                    : confirm === 'pro'
                                        ? `Set ${target.email} to Pro for 30 days?`
                                        : `Set ${target.email} to Free?`
                    }
                    onCancel={() => setConfirm(null)}
                    onConfirm={handleConfirm}
                />
            )}

            <Snackbar
                open={Boolean(toast)}
                onClose={() => setToast(null)}
                autoHideDuration={2800}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                message={toast}
            />
        </>
    );
};

// Lightweight inline confirm. Built on top of DialogBox so the look and
// feel matches the rest of the app — DialogBox renders its own trigger
// button, so we pass an empty label and auto-open it via a render flag
// on the parent.
interface ConfirmInlineProps {
    label: string;
    onConfirm: () => void;
    onCancel: () => void;
}

const ConfirmInline = ({ label, onConfirm, onCancel }: ConfirmInlineProps) => {
    // DialogBox manages its own open state — to drive it imperatively we'd
    // need to refactor it. Simpler: wrap a `<DialogBox>` with our message
    // and rely on the user clicking its trigger. But that adds friction.
    // Instead just render a tiny inline confirm strip — keeps the row
    // menu flow snappy.
    return (
        <div
            className="users-card-confirm-strip"
            role="dialog"
            aria-modal="true"
        >
            <div className="users-card-confirm-card">
                <p className="users-card-confirm-label">{label}</p>
                <div className="users-card-confirm-actions">
                    <button
                        type="button"
                        className="users-card-confirm-cancel"
                        onClick={onCancel}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="users-card-confirm-go"
                        onClick={onConfirm}
                    >
                        Continue
                    </button>
                </div>
            </div>
        </div>
    );
};

const UsersCard = () => {
    const { user } = useUser();
    const [q, setQ] = useState('');
    const [createOpen, setCreateOpen] = useState(false);
    const [toast, setToast] = useState<string | null>(null);
    const { data, isLoading, error, refetch, isFetching } = useAdminUsers(q);
    const { data: growth } = useAdminGrowth(12);
    const { data: subStats } = useAdminSubscriptionStats();
    const { data: ageDist } = useAdminAgeDistribution();
    const { data: genderDist } = useAdminUsersByGender();
    // Reuses the PieChart slices shape used by Free-vs-paid and Age
    // distribution above. Color map mirrors the standalone
    // UsersByGenderCard so the two surfaces (if both ever render in
    // the same session) stay visually consistent.
    const genderSlices = useMemo(
        () =>
            (genderDist?.buckets ?? []).map((b) => ({
                key: b.genderName,
                label: b.genderName,
                count: b.count,
            })),
        [genderDist],
    );
    const GENDER_COLORS: Record<string, string> = {
        Male: '#3a86ff',
        Female: '#f38e40',
        'Non-binary': '#8338ec',
        'Prefer not to say': '#9aa0a6',
        Unset: '#cccccc',
    };

    const actorId = user?.id ?? '';

    const growthCategories = useMemo(
        () => growth?.months.map((m) => m.month) ?? [],
        [growth]
    );
    const growthValues = useMemo(
        () => growth?.months.map((m) => m.count) ?? [],
        [growth]
    );

    // Free vs Pro pie: collapse the by-plan rows to two buckets so the
    // pie reads cleanly. Premium (reserved for a future tier) folds into
    // Pro since the operational question — "how many are paying?" —
    // doesn't care which paid tier they're on.
    const planSlices = useMemo(() => {
        if (!subStats) return [];
        const free =
            subStats.byPlan.find((p) => p.key === 'free')?.count ?? 0;
        const paid = subStats.byPlan
            .filter((p) => p.key !== 'free')
            .reduce((sum, p) => sum + p.count, 0);
        return [
            { key: 'free', label: PLAN_LABEL.free, count: free },
            { key: 'pro', label: 'Pro / Premium', count: paid },
        ];
    }, [subStats]);

    const ageSlices = useMemo(
        () =>
            (ageDist?.buckets ?? []).map((b) => ({
                key: b.key,
                label: b.label,
                count: b.count,
            })),
        [ageDist]
    );

    return (
        <section className="dashboard-card">
            <header className="dashboard-card-head users-card-head">
                <div>
                    <h2 className="dashboard-card-title">Users</h2>
                    <p className="dashboard-card-subtitle">
                        Search, create, change role, toggle subscription, or
                        soft-delete.
                    </p>
                </div>
                <div className="users-card-head-actions">
                    <button
                        type="button"
                        className="users-card-create-btn"
                        onClick={() => setCreateOpen(true)}
                    >
                        <PersonAddRoundedIcon className="users-card-create-btn-icon" />
                        <span>Create user</span>
                    </button>
                    <IconButton
                        aria-label="Refresh"
                        onClick={() => refetch()}
                        disabled={isFetching}
                    >
                        <RefreshRoundedIcon />
                    </IconButton>
                </div>
            </header>

            {growth && (
                <div className="users-card-insight">
                    <h3 className="users-card-insight-title">
                        User growth · 12 months
                    </h3>
                    <LineChart
                        categories={growthCategories}
                        series={[
                            {
                                key: 'signups',
                                label: 'Signups',
                                values: growthValues,
                                color: '#f38e40',
                            },
                        ]}
                        height={200}
                        formatX={formatMonth}
                    />
                </div>
            )}

            <div className="users-card-pie-grid">
                {subStats && (
                    <div className="users-card-insight">
                        <h3 className="users-card-insight-title">
                            Free vs paid
                        </h3>
                        <PieChart
                            slices={planSlices}
                            colorByKey={PLAN_COLORS}
                        />
                    </div>
                )}
                {ageDist && (
                    <div className="users-card-insight">
                        <h3 className="users-card-insight-title">
                            Age distribution
                        </h3>
                        <PieChart slices={ageSlices} />
                    </div>
                )}
                {genderDist && genderDist.total > 0 && (
                    <div className="users-card-insight">
                        <h3 className="users-card-insight-title">
                            Users by sex
                        </h3>
                        <PieChart
                            slices={genderSlices}
                            colorByKey={GENDER_COLORS}
                        />
                    </div>
                )}
            </div>

            <div className="users-card-search">
                <InputField
                    name="users-search"
                    label="Search by email or name"
                    defaultValue={q}
                    onChange={(e) => setQ(e.target.value)}
                />
            </div>

            {isLoading && <p className="dashboard-card-status">Loading…</p>}
            {error && (
                <p className="dashboard-card-status dashboard-card-error">
                    {error instanceof Error ? error.message : 'Failed to load'}
                </p>
            )}

            {data && data.items.length === 0 && (
                <p className="dashboard-card-status">No matches.</p>
            )}

            {data && data.items.length > 0 && (
                <div className="users-card-table-wrap">
                    <table className="users-card-table">
                        <thead>
                            <tr>
                                <th>User</th>
                                <th>Plan</th>
                                <th>Status</th>
                                <th>Trips</th>
                                <th>Period end</th>
                                <th>Joined</th>
                                <th aria-label="Actions" />
                            </tr>
                        </thead>
                        <tbody>
                            {data.items.map((u) => (
                                <tr key={u.id}>
                                    <td>
                                        <div className="users-card-user-cell">
                                            <span className="users-card-email">
                                                {u.email}
                                            </span>
                                            {u.name && (
                                                <span className="users-card-name">
                                                    {u.name}
                                                </span>
                                            )}
                                            {u.role === USER_ROLE.ADMIN && (
                                                <span className="users-card-admin-tag">
                                                    admin
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td>
                                        <span
                                            className={classnames(
                                                'users-card-plan',
                                                `users-card-plan-${u.subscriptionPlan}`
                                            )}
                                        >
                                            {u.subscriptionPlan}
                                        </span>
                                    </td>
                                    <td>
                                        <span
                                            className={classnames(
                                                'users-card-status',
                                                `users-card-status-${u.subscriptionStatus}`
                                            )}
                                        >
                                            {u.subscriptionStatus}
                                        </span>
                                    </td>
                                    <td className="users-card-num">
                                        {u.tripCount}
                                    </td>
                                    <td>{formatDateOrDash(u.currentPeriodEnd)}</td>
                                    <td>{formatDateOrDash(u.createdAt)}</td>
                                    <td>
                                        <RowMenu target={u} actorId={actorId} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <CreateUserModal
                open={createOpen}
                onClose={() => setCreateOpen(false)}
                onCreated={(email) => setToast(`Created ${email}`)}
            />

            <Snackbar
                open={Boolean(toast)}
                onClose={() => setToast(null)}
                autoHideDuration={2800}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                message={toast}
            />
        </section>
    );
};

export default UsersCard;
