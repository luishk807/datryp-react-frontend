import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, IconButton, MenuItem as MuiMenuItem } from '@mui/material';
import NotificationsNoneRoundedIcon from '@mui/icons-material/NotificationsNoneRounded';
import FlightTakeoffRoundedIcon from '@mui/icons-material/FlightTakeoffRounded';
import EditCalendarRoundedIcon from '@mui/icons-material/EditCalendarRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import EventBusyRoundedIcon from '@mui/icons-material/EventBusyRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import AlarmRoundedIcon from '@mui/icons-material/AlarmRounded';
import moment from 'moment';
import classnames from 'classnames';
import Menu from 'components/common/Menu';
import {
    useNotifications,
    useUnreadNotificationCount,
    useMarkNotificationRead,
    useMarkAllNotificationsRead,
} from 'api/hooks/useNotifications';
import { NOTIFICATION_KIND } from 'constants';
import type { ApiNotification, NotificationPayload } from 'types';
import './index.scss';

const PREVIEW_LIMIT = 10;

const KIND_ICON: Record<string, React.ElementType> = {
    [NOTIFICATION_KIND.TRIP_CREATED]: FlightTakeoffRoundedIcon,
    [NOTIFICATION_KIND.TRIP_STATUS_CHANGED]: EditCalendarRoundedIcon,
    [NOTIFICATION_KIND.TRIP_UPDATED]: EditCalendarRoundedIcon,
    [NOTIFICATION_KIND.TRIP_COMPLETED]: CheckCircleRoundedIcon,
    [NOTIFICATION_KIND.TRIP_CANCELLED]: EventBusyRoundedIcon,
    [NOTIFICATION_KIND.TRIP_DELETED]: DeleteOutlineRoundedIcon,
    [NOTIFICATION_KIND.TRIP_STARTING_SOON]: AlarmRoundedIcon,
};

/** Renders the human title for one notification, keyed by `kind`. Returns
 *  a {title, subtitle} pair so the dropdown can show 2-line items. */
const formatNotification = (
    n: ApiNotification
): { title: string; subtitle: string } => {
    const p: NotificationPayload = n.payload ?? {};
    const trip = p.trip_name || 'Your trip';
    const actor = p.actor_name || 'Someone';
    switch (n.kind) {
        case NOTIFICATION_KIND.TRIP_CREATED:
            return {
                title: `${actor} added you to "${trip}"`,
                subtitle:
                    p.start_date && p.end_date
                        ? `${p.start_date} – ${p.end_date}`
                        : 'Open the trip to see details.',
            };
        case NOTIFICATION_KIND.TRIP_STATUS_CHANGED:
        case NOTIFICATION_KIND.TRIP_COMPLETED:
        case NOTIFICATION_KIND.TRIP_CANCELLED:
            return {
                title: `"${trip}" is now ${p.new_status ?? 'updated'}`,
                subtitle: `Updated by ${actor}`,
            };
        case NOTIFICATION_KIND.TRIP_UPDATED:
            return {
                title: `${actor} updated "${trip}"`,
                subtitle: 'Check the latest changes.',
            };
        case NOTIFICATION_KIND.TRIP_DELETED:
            return {
                title: `${actor} deleted "${trip}"`,
                subtitle: 'The trip is no longer available.',
            };
        case NOTIFICATION_KIND.TRIP_STARTING_SOON:
            return {
                title: `"${trip}" starts soon`,
                subtitle: p.start_date
                    ? `Departing ${p.start_date}`
                    : 'Time to pack!',
            };
        default:
            return { title: `Trip update`, subtitle: actor };
    }
};

const relTime = (iso: string): string => moment(iso).fromNow();

const NotificationBell = () => {
    const navigate = useNavigate();
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    const { data: count = 0 } = useUnreadNotificationCount();
    const { data: rows = [] } = useNotifications();
    const markRead = useMarkNotificationRead();
    const markAllRead = useMarkAllNotificationsRead();

    const preview = useMemo(() => rows.slice(0, PREVIEW_LIMIT), [rows]);

    const handleOpen = (e: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(e.currentTarget);
    };
    const handleClose = () => setAnchorEl(null);

    const handleRowClick = (n: ApiNotification) => {
        if (!n.readAt) markRead.mutate(n.id);
        handleClose();
        // Trip-bound notifications jump to the detail page; deleted /
        // starting-soon / non-trip rows fall back to the inbox so the
        // user lands somewhere sensible.
        if (n.tripId && n.kind !== NOTIFICATION_KIND.TRIP_DELETED) {
            navigate(`/trip-detail?id=${n.tripId}`);
        } else {
            navigate('/notifications');
        }
    };

    return (
        <>
            <IconButton
                className="notification-bell"
                onClick={handleOpen}
                aria-label={
                    count
                        ? `${count} unread notifications`
                        : 'Notifications'
                }
            >
                <Badge
                    badgeContent={count}
                    color="error"
                    overlap="circular"
                    max={99}
                >
                    <NotificationsNoneRoundedIcon />
                </Badge>
            </IconButton>

            <Menu
                anchorEl={anchorEl}
                onClose={handleClose}
                paperClassName="notification-menu"
                fullScreenOnMobile
            >
                <div className="notification-menu-head">
                    <span className="notification-menu-title">Notifications</span>
                    {count > 0 && (
                        <button
                            type="button"
                            className="notification-menu-markall"
                            onClick={() => markAllRead.mutate()}
                            disabled={markAllRead.isPending}
                        >
                            Mark all read
                        </button>
                    )}
                </div>

                {preview.length === 0 ? (
                    <div className="notification-menu-empty">
                        You're all caught up.
                    </div>
                ) : (
                    preview.map((n) => {
                        const Icon =
                            KIND_ICON[n.kind] ?? NotificationsNoneRoundedIcon;
                        const { title, subtitle } = formatNotification(n);
                        return (
                            <MuiMenuItem
                                key={n.id}
                                onClick={() => handleRowClick(n)}
                                className={classnames(
                                    'common-menu-item',
                                    'notification-row',
                                    { 'is-unread': !n.readAt }
                                )}
                            >
                                <Icon className="notification-row-icon" />
                                <span className="notification-row-text">
                                    <span className="notification-row-title">
                                        {title}
                                    </span>
                                    <span className="notification-row-sub">
                                        {subtitle}
                                    </span>
                                    <span className="notification-row-time">
                                        {relTime(n.createdAt)}
                                    </span>
                                </span>
                            </MuiMenuItem>
                        );
                    })
                )}

                <div className="notification-menu-foot">
                    <button
                        type="button"
                        className="notification-menu-seeall"
                        onClick={() => {
                            handleClose();
                            navigate('/notifications');
                        }}
                    >
                        See all
                    </button>
                </div>
            </Menu>
        </>
    );
};

export default NotificationBell;
