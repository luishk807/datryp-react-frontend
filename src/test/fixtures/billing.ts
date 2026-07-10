/** Wire-shape fixtures for the Stripe billing session endpoints. The module's
 *  raw response interfaces are private, so the shape is pinned locally as
 *  `as const`. Both endpoints return a single hosted `url`. */
export const checkoutSessionFixture = {
    url: 'https://checkout.stripe.com/c/pay/cs_test_a1b2c3',
} as const;

export const portalSessionFixture = {
    url: 'https://billing.stripe.com/p/session/test_x9y8z7',
} as const;
