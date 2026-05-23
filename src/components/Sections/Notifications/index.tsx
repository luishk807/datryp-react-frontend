import { useNavigate } from 'react-router-dom';
import NotificationsNoneRoundedIcon from '@mui/icons-material/NotificationsNoneRounded';
import FlightTakeoffRoundedIcon from '@mui/icons-material/FlightTakeoffRounded';
import EditCalendarRoundedIcon from '@mui/icons-material/EditCalendarRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import EventBusyRoundedIcon from '@mui/icons-material/EventBusyRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import AlarmRoundedIcon from '@mui/icons-material/AlarmRounded';
import moment from 'moment';
import classnames from 'classnames';
import Layout from 'components/common/Layout/SubLayout';
import ButtonCustom from 'components/common/FormFields/ButtonCustom';
import {
    useNotifications,
    useMarkNotificationRead,
    useMarkAllNotificationsRead,
} from 'api/hooks/useNotifications';
import { NOTIFICATION_KIND } from 'constants';
import type { ApiNotification, NotificationPayload } from 'types';
import './index.scss';

const KIND_ICON: Record<string, React.ElementType> = {
    [NOTIFICATION_KIND.TRIP_CREATED]: FlightTakeoffRoundedIcon,
    [NOTIFICATION_KIND.TRIP_STATUS_CHANGED]: EditCalendarRoundedIcon,
    [NOTIFICATION_KIND.TRIP_UPDATED]: EditCalendarRoundedIcon,
    [NOTIFICATION_KIND.TRIP_COMPLETED]: CheckCircleRoundedIcon,
    [NOTIFICATION_KIND.TRIP_CANCELLED]: EventBusyRoundedIcon,
    [NOTIFICATION_KIND.TRIP_DELETED]: DeleteOutlineRoundedIcon,
    [NOTIFICATION_KIND.TRIP_STARTING_SOON]: AlarmRoundedIcon,
};

const formatRow = (
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

const Notifications = () => {
    const navigate = useNavigate();
    const { data: rows = [], isLoading } = useNotifications();
    const markRead = useMarkNotificationRead();
    const markAllRead = useMarkAllNotificationsRead();

    const unread = rows.filter((r) => !r.readAt).length;

    const handleRowClick = (n: ApiNotification) => {
        if (!n.readAt) markRead.mutate(n.id);
        if (n.tripId && n.kind !== NOTIFICATION_KIND.TRIP_DELETED) {
            navigate(`/trip-detail?id=${n.tripId}`);
        }
    };

    return (
        <Layout>
            <div className="notifications-page">
                <div className="notifications-page-head">
                    <h1 className="notifications-page-title">Notifications</h1>
                    {unread > 0 && (
                        <ButtonCustom
                            type="line"
                            capitalizeType="none"
                            label={
                                markAllRead.isPending
                                    ? 'Marking…'
                                    : `Mark all read (${unread})`
                            }
                            onClick={() => markAllRead.mutate()}
                            disabled={markAllRead.isPending}
                        />
                    )}
                </div>

                {isLoading ? (
                    <p className="notifications-page-loading">Loading…</p>
                ) : rows.length === 0 ? (
                    <div className="notifications-page-empty">
                        <NotificationsNoneRoundedIcon className="empty-icon" />
                        <p>No notifications yet.</p>
                        <span>
                            You'll see trip invites, status changes, and trip
                            reminders here.
                        </span>
                    </div>
                ) : (
                    <ul className="notifications-list">
                        {rows.map((n) => {
                            const Icon =
                                KIND_ICON[n.kind] ?? NotificationsNoneRoundedIcon;
                            const { title, subtitle } = formatRow(n);
                            return (
                                <li
                                    key={n.id}
                                    className={classnames('notifications-row', {
                                        'is-unread': !n.readAt,
                                    })}
                                >
                                    <button
                                        type="button"
                                        className="notifications-row-btn"
                                        onClick={() => handleRowClick(n)}
                                    >
                                        <Icon className="notifications-row-icon" />
                                        <span className="notifications-row-body">
                                            <span className="notifications-row-title">
                                                {title}
                                            </span>
                                            <span className="notifications-row-sub">
                                                {subtitle}
                                            </span>
                                            <span className="notifications-row-time">
                                                {moment(n.createdAt).fromNow()}
                                            </span>
                                        </span>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </Layout>
    );
};

export default Notifications;
