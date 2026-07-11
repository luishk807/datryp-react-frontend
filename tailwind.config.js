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
                'primaryOrange': '#f6891f',
                'primaryYellow': '#f7c61a',
                'primary': '#464646'
            }
        },
    },
    plugins: [],
};
