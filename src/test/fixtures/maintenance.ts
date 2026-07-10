/** Wire-shape fixtures for the maintenance-mode state
 *  (`GET /maintenance` + `POST /admin/settings/maintenance`). The raw type
 *  isn't exported from the module, so we pin the wire shape locally here. */
export interface MaintenanceStatusWire {
    active: boolean;
    mode: 'banner' | 'full';
    message: string | null;
    until: string | null;
}

export const maintenanceActiveFixture: MaintenanceStatusWire = {
    active: true,
    mode: 'banner',
    message: 'Scheduled upgrade in progress — some features may be slow.',
    until: '2026-07-11T02:00:00Z',
};

export const maintenanceOffFixture: MaintenanceStatusWire = {
    active: false,
    mode: 'full',
    message: null,
    until: null,
};
