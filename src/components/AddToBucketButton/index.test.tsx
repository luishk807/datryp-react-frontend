import { describe, it, expect, beforeEach, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '../../test/renderWithProviders';

const mockAdd = vi.fn();
let mockIsPending = false;
let mockIsError = false;
let mockError: unknown = null;
let mockBucketList: Array<{ text: string }> = [];

vi.mock('api/hooks/useBucketList', () => ({
    useAddBucketListItem: () => ({
        mutateAsync: mockAdd,
        isPending: mockIsPending,
        isError: mockIsError,
        error: mockError,
    }),
    useBucketList: () => ({ data: mockBucketList }),
}));

import AddToBucketButton from './index';

beforeEach(() => {
    mockAdd.mockReset();
    mockAdd.mockResolvedValue(undefined);
    mockIsPending = false;
    mockIsError = false;
    mockError = null;
    mockBucketList = [];
});

describe('AddToBucketButton', () => {
    it('renders the icon trigger with an accessible add name and no open modal', () => {
        renderWithProviders(<AddToBucketButton kind="place" name="Kyoto" />);
        expect(
            screen.getByRole('button', {
                name: 'Add Kyoto to your bucket list',
            })
        ).toBeInTheDocument();
        expect(
            screen.queryByRole('heading', { name: 'Add to bucket list' })
        ).not.toBeInTheDocument();
    });

    it('flips to the already-added affordance when the goal is already in the list', () => {
        mockBucketList = [{ text: 'Visiting Kyoto' }];
        const { container } = renderWithProviders(
            <AddToBucketButton kind="place" name="Kyoto" />
        );
        expect(
            screen.getByRole('button', {
                name: 'Already on your bucket list: Kyoto',
            })
        ).toBeInTheDocument();
        expect(
            container.querySelector('.is-already-added')
        ).toBeInTheDocument();
    });

    it('renders the pill variant with its label, flipping when already added', () => {
        const { rerender } = renderWithProviders(
            <AddToBucketButton kind="city" name="Kyoto" variant="pill" />
        );
        expect(screen.getByText('Bucket list')).toBeInTheDocument();

        mockBucketList = [{ text: 'Visiting Kyoto' }];
        rerender(
            <AddToBucketButton kind="city" name="Kyoto" variant="pill" />
        );
        expect(screen.getByText('In bucket list')).toBeInTheDocument();
    });

    it('opens a modal with the pre-filled default goal text', async () => {
        renderWithProviders(<AddToBucketButton kind="place" name="Kyoto" />);
        await userEvent.click(
            screen.getByRole('button', {
                name: 'Add Kyoto to your bucket list',
            })
        );
        expect(
            screen.getByRole('heading', { name: 'Add to bucket list' })
        ).toBeInTheDocument();
        expect(
            screen.getByRole('textbox', { name: 'Goal for this place' })
        ).toHaveValue('Visiting Kyoto');
    });

    it('submits the goal text and shows the added confirmation', async () => {
        renderWithProviders(<AddToBucketButton kind="place" name="Kyoto" />);
        await userEvent.click(
            screen.getByRole('button', {
                name: 'Add Kyoto to your bucket list',
            })
        );
        await userEvent.click(
            screen.getByRole('button', { name: 'Add to bucket list' })
        );
        expect(mockAdd).toHaveBeenCalledWith('Visiting Kyoto');
        expect(
            await screen.findByText('Added to your bucket list')
        ).toBeInTheDocument();
    });

    it('submits edited goal text', async () => {
        renderWithProviders(<AddToBucketButton kind="place" name="Kyoto" />);
        await userEvent.click(
            screen.getByRole('button', {
                name: 'Add Kyoto to your bucket list',
            })
        );
        const field = screen.getByRole('textbox', {
            name: 'Goal for this place',
        });
        await userEvent.clear(field);
        await userEvent.type(field, 'See Fushimi Inari');
        await userEvent.click(
            screen.getByRole('button', { name: 'Add to bucket list' })
        );
        expect(mockAdd).toHaveBeenCalledWith('See Fushimi Inari');
    });

    it('surfaces the mutation error inside the modal', async () => {
        mockIsError = true;
        mockError = new Error('server said no');
        renderWithProviders(<AddToBucketButton kind="country" name="Japan" />);
        await userEvent.click(
            screen.getByRole('button', {
                name: 'Add Japan to your bucket list',
            })
        );
        const alert = await screen.findByRole('alert');
        expect(alert).toHaveTextContent('server said no');
    });
});
