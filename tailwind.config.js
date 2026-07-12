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
                'primaryYellow': '#f7c61a',
                'primary': '#464646'
            }
        },
    },
    plugins: [],
};
