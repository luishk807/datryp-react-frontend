/**
 * RAW wire fixture for the notify fan-out. The snake_case envelope
 * (`in_app`) is private to the module, so it's pinned inline here; the client
 * reshapes it to camelCase (`inApp`).
 */
export const notifyActivityRawFixture = {
    recipients: 4,
    in_app: 4,
    emails: 2,
    sms: 1,
} as const;
