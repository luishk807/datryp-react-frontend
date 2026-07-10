/** Wire-shape fixtures for the "free everything" admin toggle
 *  (`GET`/`POST /admin/settings/free-everything`). The raw type isn't exported
 *  from the module, so we pin the wire shape locally here. */
export interface FreeEverythingStatusWire {
    active: boolean;
    until: string | null;
}

export const freeEverythingActiveFixture: FreeEverythingStatusWire = {
    active: true,
    until: '2026-12-31T23:59:59Z',
};

export const freeEverythingOffFixture: FreeEverythingStatusWire = {
    active: false,
    until: null,
};
