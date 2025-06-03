/** @type {import('tailwindcss').Config} */
module.exports = {
  // 1) Tell Tailwind which files to scan for class names
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}"
  ],
  // 2) Pull in the NativeWind preset so React Native variants work
  presets: [require("nativewind/preset")],
  theme: {
    extend: {},
  },
  plugins: [],
};

