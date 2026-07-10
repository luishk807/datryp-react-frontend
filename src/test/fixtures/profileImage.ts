/** Wire-shape fixtures for `POST /me/profile-image`. The module's raw response
 *  interface is private, so the shape is pinned locally as `as const`.
 *  The cache-busting `?v=<ts>` suffix mirrors what the backend returns. */
export const profileImageResponseFixture = {
    profile_image_url:
        'https://cdn.example.com/profile/user-123.jpg?v=1720483200',
} as const;

/** Cleared image — the client returns null straight through. */
export const profileImageNullFixture = {
    profile_image_url: null,
} as const;
