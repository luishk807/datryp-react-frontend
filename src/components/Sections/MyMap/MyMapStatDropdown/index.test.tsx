import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import PublicRoundedIcon from '@mui/icons-material/PublicRounded';
import {
    renderWithProviders,
    screen,
    within,
    fireEvent,
} from '../../../../test/renderWithProviders';
import MyMapStatDropdown, {
    type MyMapStatDropdownOption,
    type MyMapStatDropdownProps,
} from './index';

const options: MyMapStatDropdownOption[] = [
    { id: 'US', label: 'United States', sublabel: 'US', flagCode: 'US', tripCount: 2 },
    { id: 'FR', label: 'France', sublabel: 'FR', flagCode: 'FR', tripCount: 0 },
    { id: 'XX', label: 'Nowhere', disabled: true, disabledReason: 'No coordinates' },
];

const setup = (over: Partial<MyMapStatDropdownProps> = {}) => {
    const props: MyMapStatDropdownProps = {
        icon: <PublicRoundedIcon />,
        count: 3,
        label: 'countries',
        options,
        isOpen: false,
        onToggle: vi.fn(),
        onClose: vi.fn(),
        onSelect: vi.fn(),
        ...over,
    };
    const utils = renderWithProviders(<MyMapStatDropdown {...props} />);
    return { props, ...utils };
};

describe('MyMapStatDropdown', () => {
    it('renders a collapsed trigger with count + label and combobox semantics', () => {
        setup();
        const trigger = screen.getByRole('button');
        expect(trigger).toHaveAttribute('aria-expanded', 'false');
        expect(trigger).toHaveAttribute('aria-haspopup', 'listbox');
        expect(trigger).toHaveTextContent('3');
        expect(trigger).toHaveTextContent('countries');
        // Panel is closed — no listbox rendered.
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('calls onToggle when the trigger is clicked', async () => {
        const { props } = setup();
        await userEvent.click(screen.getByRole('button'));
        expect(props.onToggle).toHaveBeenCalledTimes(1);
    });

    it('renders the option list when open and selects an enabled option', async () => {
        const { props } = setup({ isOpen: true });
        const listbox = screen.getByRole('listbox', { name: 'countries' });
        expect(within(listbox).getByText('United States')).toBeInTheDocument();
        await userEvent.click(
            within(listbox).getByRole('button', { name: /United States/ })
        );
        expect(props.onSelect).toHaveBeenCalledWith('US');
    });

    it('disables an option with no coordinates and does not select it', async () => {
        const { props } = setup({ isOpen: true });
        const disabled = screen.getByRole('button', { name: /Nowhere/ });
        expect(disabled).toBeDisabled();
        expect(disabled).toHaveAttribute('title', 'No coordinates');
        await userEvent.click(disabled);
        expect(props.onSelect).not.toHaveBeenCalled();
    });

    it('shows a trips-on-file dot only for options with a positive trip count', () => {
        setup({ isOpen: true });
        expect(
            screen.getByLabelText('2 trips on file')
        ).toBeInTheDocument();
        // France has tripCount 0 → no dot.
        expect(screen.queryByLabelText(/0 trips on file/)).not.toBeInTheDocument();
    });

    it('renders the visibility toggle with aria-pressed and fires onToggleVisible', async () => {
        const onToggleVisible = vi.fn();
        setup({ isOpen: true, visible: true, onToggleVisible });
        const eye = screen.getByRole('button', {
            name: 'Hide countries on map',
        });
        expect(eye).toHaveAttribute('aria-pressed', 'true');
        await userEvent.click(eye);
        expect(onToggleVisible).toHaveBeenCalledTimes(1);
    });

    it('labels the visibility toggle as "Show" when the layer is hidden', () => {
        setup({ isOpen: true, visible: false, onToggleVisible: vi.fn() });
        const eye = screen.getByRole('button', {
            name: 'Show countries on map',
        });
        expect(eye).toHaveAttribute('aria-pressed', 'false');
    });

    it('renders the empty hint when there are no options', () => {
        setup({ isOpen: true, options: [], emptyHint: 'No visited countries yet.' });
        expect(
            screen.getByText('No visited countries yet.')
        ).toBeInTheDocument();
    });

    it('falls back to the default empty text without an emptyHint', () => {
        setup({ isOpen: true, options: [] });
        expect(screen.getByText('Nothing here yet.')).toBeInTheDocument();
    });

    it('closes on Escape and on an outside click', () => {
        const onClose = vi.fn();
        setup({ isOpen: true, onClose });
        fireEvent.keyDown(document, { key: 'Escape' });
        fireEvent.mouseDown(document.body);
        expect(onClose).toHaveBeenCalled();
    });

    it('applies the align-right modifier class', () => {
        const { container } = setup({ alignRight: true });
        expect(
            container.querySelector('.my-map-stat-dropdown.is-align-right')
        ).toBeInTheDocument();
    });
});
