import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import PublicRoundedIcon from '@mui/icons-material/PublicRounded';
import LocationCityRoundedIcon from '@mui/icons-material/LocationCityRounded';
import {
    renderWithProviders,
    screen,
    within,
    fireEvent,
} from '../../../../test/renderWithProviders';
import MyMapLayersMenu, {
    type MyMapLayerDescriptor,
} from './index';

const makeLayers = (
    over: Partial<Record<string, Partial<MyMapLayerDescriptor>>> = {}
): MyMapLayerDescriptor[] => [
    {
        key: 'countries',
        icon: <PublicRoundedIcon />,
        label: 'Countries',
        count: 2,
        visible: true,
        onToggleVisible: vi.fn(),
        options: [
            { id: 'US', label: 'United States', sublabel: 'US', flagCode: 'US' },
            { id: 'XX', label: 'Nowhere', disabled: true, disabledReason: 'No coords' },
        ],
        onSelect: vi.fn(),
        emptyHint: 'No visited countries yet.',
        ...over.countries,
    },
    {
        key: 'cities',
        icon: <LocationCityRoundedIcon />,
        label: 'Cities',
        count: 0,
        visible: false,
        onToggleVisible: vi.fn(),
        options: [],
        onSelect: vi.fn(),
        ...over.cities,
    },
];

const openMenu = async () => {
    await userEvent.click(
        screen.getByRole('button', { name: /Layers/ })
    );
};

describe('MyMapLayersMenu', () => {
    it('renders a collapsed trigger with the summed layer total', () => {
        renderWithProviders(<MyMapLayersMenu layers={makeLayers()} />);
        const trigger = screen.getByRole('button', { name: /Layers/ });
        expect(trigger).toHaveAttribute('aria-expanded', 'false');
        expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
        // total = 2 + 0
        expect(trigger).toHaveTextContent('2');
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('opens the layer list and toggles a layer visibility', async () => {
        const layers = makeLayers();
        renderWithProviders(<MyMapLayersMenu layers={layers} />);
        await openMenu();
        expect(screen.getByRole('menu')).toBeInTheDocument();
        const check = screen.getByRole('button', { name: 'Hide Countries' });
        expect(check).toHaveAttribute('aria-pressed', 'true');
        await userEvent.click(check);
        expect(layers[0].onToggleVisible).toHaveBeenCalledTimes(1);
        // Hidden layer surfaces a "Show" label + unpressed state.
        expect(
            screen.getByRole('button', { name: 'Show Cities' })
        ).toHaveAttribute('aria-pressed', 'false');
    });

    it('drills into a layer, selects an option, and closes the menu', async () => {
        const layers = makeLayers();
        renderWithProviders(<MyMapLayersMenu layers={layers} />);
        await openMenu();
        // Row main button (label + count) drills in.
        await userEvent.click(
            screen.getByRole('button', { name: /Countries 2/ })
        );
        const option = screen.getByRole('button', { name: /United States/ });
        await userEvent.click(option);
        expect(layers[0].onSelect).toHaveBeenCalledWith('US');
        // Selecting closes the whole menu.
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('does not select a disabled option in the detail view', async () => {
        const layers = makeLayers();
        renderWithProviders(<MyMapLayersMenu layers={layers} />);
        await openMenu();
        await userEvent.click(
            screen.getByRole('button', { name: /Countries 2/ })
        );
        const disabled = screen.getByRole('button', { name: /Nowhere/ });
        expect(disabled).toBeDisabled();
        expect(disabled).toHaveAttribute('title', 'No coords');
        await userEvent.click(disabled);
        expect(layers[0].onSelect).not.toHaveBeenCalled();
    });

    it('goes back to the layer list from a detail view', async () => {
        renderWithProviders(<MyMapLayersMenu layers={makeLayers()} />);
        await openMenu();
        await userEvent.click(
            screen.getByRole('button', { name: /Countries 2/ })
        );
        await userEvent.click(
            screen.getByRole('button', { name: 'Back to layers' })
        );
        // Back on the list — both layer rows visible again.
        expect(
            screen.getByRole('button', { name: /Cities 0/ })
        ).toBeInTheDocument();
    });

    it('shows the empty hint for a layer with no options', async () => {
        renderWithProviders(<MyMapLayersMenu layers={makeLayers()} />);
        await openMenu();
        await userEvent.click(
            screen.getByRole('button', { name: /Cities 0/ })
        );
        expect(screen.getByText('Nothing here yet.')).toBeInTheDocument();
    });

    it('closes on the trigger toggle, Escape, and an outside click', async () => {
        renderWithProviders(<MyMapLayersMenu layers={makeLayers()} />);
        // Toggle closed via the trigger.
        await openMenu();
        await userEvent.click(screen.getByRole('button', { name: /Layers/ }));
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();

        // Escape closes.
        await openMenu();
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();

        // Outside click closes.
        await openMenu();
        fireEvent.mouseDown(document.body);
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
});
