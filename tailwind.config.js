/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,jsx,ts,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                'primaryGreen': '#3cb54b',
                // Deepened from #f6891f for WCAG AA: white text on the brand
                // orange was only 2.46:1 (CTAs / selected tab / chips). #c2410c
                // gives white-on-orange ~5.2:1 and orange-text-on-white ~5.2:1,
                // both passing AA. Decorative-only hardcoded oranges (map
                // marker, popularity gradient, PDF export) intentionally keep
                // the brighter #f6891f — no text sits on them.
                'primaryOrange': '#c2410c',
                'primaryYellow': '#f7c61a',
                'primary': '#464646'
            }
        },
    },
    plugins: [],
};
