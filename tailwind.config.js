/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,jsx,ts,tsx}",
        // Exclude test/spec files and test infra from the Tailwind scan. On
        // Windows, scanning the whole tree (~480 test files on top of the app
        // source) opens so many files at once that the dev server / build hits
        // EMFILE ("too many open files"). Tests never contribute classes to the
        // shipped CSS — every class they assert on exists in the component
        // source that IS scanned — so dropping them is safe and roughly halves
        // the concurrent file opens.
        "!./src/**/*.{test,spec}.{ts,tsx}",
        "!./src/test/**",
    ],
    theme: {
        extend: {
            colors: {
                'primaryGreen': '#3cb54b',
                'primaryOrange': '#f6891f',
                // Darker orange reserved for SOLID orange fills that carry
                // TEXT. White on the bright `primaryOrange` (#f6891f) is only
                // ~2.5:1 (fails WCAG AA); white on this deeper #b84f00 is
                // ~5.1:1 (passes). Use `primaryOrange` for decorative accents
                // (left-rules, tints, gradients — no text on them) and this
                // token whenever there's white/light text on a solid orange
                // chip/thumb/button. Product prefers white-on-deep-orange over
                // dark-text-on-bright-orange for brand consistency.
                'primaryOrangeDeep': '#b84f00',
                'primaryYellow': '#f7c61a',
                'primary': '#464646'
            }
        },
    },
    plugins: [],
};
