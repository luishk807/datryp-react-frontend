import { describe, it, expect, vi } from 'vitest';
import InfoRoundedIcon from '@mui/icons-material/InfoRounded';
import { renderWithProviders, screen } from '../../../test/renderWithProviders';
import AsyncDetailSection from './index';

const baseProps = {
    title: 'Weather',
    icon: <InfoRoundedIcon />,
    errorMessage: 'Could not load weather.',
};

describe('AsyncDetailSection', () => {
    it('calls the render prop with resolved data and shows the result', () => {
        const children = vi.fn((data: { temp: number }) => (
            <p>{`It is ${data.temp}°`}</p>
        ));
        renderWithProviders(
            <AsyncDetailSection {...baseProps} data={{ temp: 21 }}>
                {children}
            </AsyncDetailSection>
        );

        expect(
            screen.getByRole('heading', { name: 'Weather' })
        ).toBeInTheDocument();
        expect(screen.getByText('It is 21°')).toBeInTheDocument();
        expect(children).toHaveBeenCalledWith({ temp: 21 });
    });

    it('shows an inline alert with the error message when isError is set', () => {
        const children = vi.fn(() => <p>should not render</p>);
        renderWithProviders(
            <AsyncDetailSection {...baseProps} data={null} isError>
                {children}
            </AsyncDetailSection>
        );

        const alert = screen.getByRole('alert');
        expect(alert).toHaveTextContent('Could not load weather.');
        expect(children).not.toHaveBeenCalled();
    });

    it('shows the loading hint (aria-live) above the skeleton when loading', () => {
        renderWithProviders(
            <AsyncDetailSection
                {...baseProps}
                data={undefined}
                loadingHint="Fetching weather…"
            >
                {() => <p>ignored</p>}
            </AsyncDetailSection>
        );

        const hint = screen.getByText('Fetching weather…');
        expect(hint).toBeInTheDocument();
        expect(hint).toHaveAttribute('aria-live', 'polite');
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('renders just the skeleton (no hint, no alert) when nothing is passed', () => {
        renderWithProviders(
            <AsyncDetailSection {...baseProps} data={undefined}>
                {() => <p>ignored</p>}
            </AsyncDetailSection>
        );
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
        expect(screen.queryByText('ignored')).not.toBeInTheDocument();
    });
});
