import { describe, it, expect } from 'vitest';
import { DndContext } from '@dnd-kit/core';
import { SortableContext } from '@dnd-kit/sortable';
import { render, screen } from '../../../../test/renderWithProviders';
import DraggableActivity from './index';

const wrap = (ui: React.ReactElement, ids: string[]) => (
    <DndContext>
        <SortableContext items={ids}>{ui}</SortableContext>
    </DndContext>
);

describe('DraggableActivity', () => {
    it('renders its children inside the sortable wrapper', () => {
        render(
            wrap(
                <DraggableActivity activityId={7} destIdx={0} date="2026-08-01">
                    <div>Museum visit</div>
                </DraggableActivity>,
                ['act-7']
            )
        );
        expect(screen.getByText('Museum visit')).toBeInTheDocument();
    });

    it('shows a grab cursor when draggable is enabled', () => {
        const { container } = render(
            wrap(
                <DraggableActivity activityId={1} destIdx={0} date="2026-08-01">
                    <span>card</span>
                </DraggableActivity>,
                ['act-1']
            )
        );
        const el = container.firstElementChild as HTMLElement;
        expect(el).toHaveStyle({ cursor: 'grab' });
    });

    it('falls back to the default cursor when disabled (view mode / locked place)', () => {
        const { container } = render(
            wrap(
                <DraggableActivity
                    activityId={2}
                    destIdx={1}
                    date="2026-08-02"
                    disabled
                >
                    <span>card</span>
                </DraggableActivity>,
                ['act-2']
            )
        );
        const el = container.firstElementChild as HTMLElement;
        expect(el).toHaveStyle({ cursor: 'default' });
    });
});
