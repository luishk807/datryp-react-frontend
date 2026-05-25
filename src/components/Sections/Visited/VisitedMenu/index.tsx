import classNames from 'classnames';
import PublicRoundedIcon from '@mui/icons-material/PublicRounded';
import LocationCityRoundedIcon from '@mui/icons-material/LocationCityRounded';
import PlaceRoundedIcon from '@mui/icons-material/PlaceRounded';
import './index.scss';

export type VisitedTabKey = 'countries' | 'cities' | 'places';

interface VisitedMenuItem {
    key: VisitedTabKey;
    label: string;
    count: number;
}

export interface VisitedMenuProps {
    active: VisitedTabKey;
    onChange: (key: VisitedTabKey) => void;
    counts: Record<VisitedTabKey, number>;
}

const ICONS: Record<VisitedTabKey, React.ElementType> = {
    countries: PublicRoundedIcon,
    cities: LocationCityRoundedIcon,
    places: PlaceRoundedIcon,
};

const VisitedMenu = ({ active, onChange, counts }: VisitedMenuProps) => {
    const items: VisitedMenuItem[] = [
        { key: 'countries', label: 'Countries', count: counts.countries },
        { key: 'cities', label: 'Cities', count: counts.cities },
        { key: 'places', label: 'Places', count: counts.places },
    ];

    return (
        <nav className="visited-menu" aria-label="Visited categories">
            {items.map((item) => {
                const Icon = ICONS[item.key];
                const isActive = active === item.key;
                return (
                    <button
                        key={item.key}
                        type="button"
                        className={classNames('visited-menu-item', {
                            'is-active': isActive,
                        })}
                        aria-current={isActive ? 'page' : undefined}
                        onClick={() => onChange(item.key)}
                    >
                        <Icon className="visited-menu-icon" fontSize="small" />
                        <span className="visited-menu-label">
                            {item.label}
                        </span>
                        <span className="visited-menu-count">
                            {item.count}
                        </span>
                    </button>
                );
            })}
        </nav>
    );
};

export default VisitedMenu;
