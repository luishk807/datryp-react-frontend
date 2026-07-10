import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import {
    renderWithProviders,
    screen,
} from '../../../../../test/renderWithProviders';
import type { FormController, PlaceDraft } from '../../types';
import NoteForm from './index';

const makeController = (
    place: PlaceDraft = {},
    over: Partial<FormController> = {},
): FormController =>
    ({
        place,
        handleOnChange: vi.fn(),
        ...over,
    }) as unknown as FormController;

describe('NoteForm', () => {
    beforeEach(() => vi.clearAllMocks());

    it('renders the labelled note textarea with its placeholder', () => {
        renderWithProviders(<NoteForm controller={makeController()} />);
        const field = screen.getByRole('textbox', { name: 'Note' });
        expect(field).toBeInTheDocument();
        expect(field).toHaveAttribute(
            'placeholder',
            'Jot down anything — reminders, ideas, links, packing checklist…',
        );
    });

    it('shows the existing note value from the draft', () => {
        renderWithProviders(
            <NoteForm controller={makeController({ note: 'Bring passport' })} />,
        );
        expect(screen.getByRole('textbox', { name: 'Note' })).toHaveValue(
            'Bring passport',
        );
    });

    it('fires handleOnChange with the mapped note field on typing', async () => {
        const handleOnChange = vi.fn();
        renderWithProviders(
            <NoteForm controller={makeController({}, { handleOnChange })} />,
        );
        await userEvent.type(screen.getByRole('textbox', { name: 'Note' }), 'x');
        expect(handleOnChange).toHaveBeenCalledWith('note', 'x');
    });
});
