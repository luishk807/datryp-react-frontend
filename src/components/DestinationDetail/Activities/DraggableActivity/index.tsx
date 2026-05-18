import type { ReactNode } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export interface DraggableActivityProps {
    /** Unique identity — pairs with `Activity.id` on the trip state. Used as
     *  the sortable id (prefixed `act-`) so it can't collide with day
     *  droppable ids. */
    activityId: number;
    /** Source destination index — needed in `onDragEnd` to dispatch
     *  `movePlace` without re-scanning the whole tree. */
    destIdx: number;
    /** Source ItineraryDay date (any parseable string). */
    date: string;
    children: ReactNode;
    /** When true, drag is disabled — used in view mode or for confirmed
     *  places where dragging would conflict with edit-lock semantics. */
    disabled?: boolean;
}

/** Wrap an activity card to make it sortable within its day and draggable
 *  across days (and destinations on multi-trips). Uses dnd-kit's PointerSensor
 *  with an 8px activation threshold — kept at the DndContext level — so a
 *  regular click on edit/delete buttons inside the card still works. */
const DraggableActivity = ({
    activityId,
    destIdx,
    date,
    children,
    disabled = false,
}: DraggableActivityProps) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: `act-${activityId}`,
        data: { type: 'activity', activityId, destIdx, date },
        disabled,
    });

    return (
        <div
            ref={setNodeRef}
            style={{
                transform: CSS.Transform.toString(transform),
                transition,
                opacity: isDragging ? 0.4 : 1,
                // Don't let dnd-kit's CSS rule add a pointer cursor in
                // disabled (view) mode — keeps the rest of the page calm.
                cursor: disabled ? 'default' : 'grab',
            }}
            {...attributes}
            {...listeners}
        >
            {children}
        </div>
    );
};

export default DraggableActivity;
