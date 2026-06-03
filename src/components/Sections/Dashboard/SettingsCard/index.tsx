import './index.scss';
import FreeEverythingCard from './FreeEverythingCard';
import MaintenanceCard from './MaintenanceCard';

/**
 * Admin → Settings. Container for the app-wide configuration cards. Each knob
 * is its own focused component; this file just composes them and owns the
 * shared `.settings-card-*` layout classes (imported above) that the children
 * rely on.
 */
const SettingsCard = () => (
    <>
        <FreeEverythingCard />
        <MaintenanceCard />
    </>
);

export default SettingsCard;
