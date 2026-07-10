import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import {
    renderWithProviders,
    screen,
    waitFor,
} from '../../../../test/renderWithProviders';
import { BucketListBlockedError } from 'api/bucketListApi';

const { mockAdd, mockRemove } = vi.hoisted(() => ({
    mockAdd: vi.fn(),
    mockRemove: vi.fn(),
}));

let mockItems: { id: string; text: string }[] = [];

vi.mock('api/hooks/useBucketList', () => ({
    useBucketList: () => ({ data: mockItems }),
    useAddBucketListItem: () => ({ mutateAsync: mockAdd, isPending: false }),
    useDeleteBucketListItem: () => ({ mutateAsync: mockRemove }),
}));

import StepBucketList from './index';

beforeEach(() => {
    mockAdd.mockReset();
    mockAdd.mockResolvedValue(undefined);
    mockRemove.mockReset();
    mockRemove.mockResolvedValue(undefined);
    mockItems = [];
});

describe('Signup / StepBucketList', () => {
    it('renders the bucket-list question with a labelled input', () => {
        renderWithProviders(
            <StepBucketList onFinish={vi.fn()} onSkip={vi.fn()} />
        );
        expect(
            screen.getByRole('heading', { name: 'On your bucket list?' })
        ).toBeInTheDocument();
        expect(
            screen.getByRole('textbox', { name: 'On your bucket list?' })
        ).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled();
    });

    it('adds a trimmed goal and clears the input', async () => {
        renderWithProviders(
            <StepBucketList onFinish={vi.fn()} onSkip={vi.fn()} />
        );
        const input = screen.getByRole('textbox', {
            name: 'On your bucket list?',
        });
        await userEvent.type(input, 'See the Northern Lights');
        await userEvent.click(screen.getByRole('button', { name: 'Add' }));
        await waitFor(() =>
            expect(mockAdd).toHaveBeenCalledWith('See the Northern Lights')
        );
        expect(input).toHaveValue('');
    });

    it('renders existing goals with a labelled remove control', () => {
        mockItems = [{ id: 'b1', text: 'Dive the Great Barrier Reef' }];
        renderWithProviders(
            <StepBucketList onFinish={vi.fn()} onSkip={vi.fn()} />
        );
        expect(
            screen.getByText('Dive the Great Barrier Reef')
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', {
                name: 'Remove "Dive the Great Barrier Reef"',
            })
        ).toBeInTheDocument();
    });

    it('surfaces a moderation-blocked message', async () => {
        mockAdd.mockRejectedValue(
            new BucketListBlockedError({
                message: 'That goal was blocked.',
                category: 'weapons',
            })
        );
        renderWithProviders(
            <StepBucketList onFinish={vi.fn()} onSkip={vi.fn()} />
        );
        await userEvent.type(
            screen.getByRole('textbox', { name: 'On your bucket list?' }),
            'something blocked'
        );
        await userEvent.click(screen.getByRole('button', { name: 'Add' }));
        expect(await screen.findByRole('alert')).toHaveTextContent(
            'That goal was blocked.'
        );
    });

    it('finishes and skips via the footer controls', async () => {
        const onFinish = vi.fn();
        const onSkip = vi.fn();
        renderWithProviders(
            <StepBucketList onFinish={onFinish} onSkip={onSkip} />
        );
        await userEvent.click(screen.getByRole('button', { name: 'Finish' }));
        expect(onFinish).toHaveBeenCalledTimes(1);
        await userEvent.click(
            screen.getByRole('button', { name: 'Skip the rest' })
        );
        expect(onSkip).toHaveBeenCalledTimes(1);
    });
});
