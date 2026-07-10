/** Wire-shape fixture for `GET /me/destination-fit`. The 200 body is a minimal
 *  `{ opinion?: string }`; the fixture carries surrounding whitespace so the
 *  client's `.trim()` is observable in the test. */
export const destinationFitWireFixture = {
    opinion: '  Given your love of ramen and quiet temples, Kyoto is a strong fit.  ',
} as const;
