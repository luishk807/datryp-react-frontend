/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
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

