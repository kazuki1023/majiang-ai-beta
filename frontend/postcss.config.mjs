const config = {
  plugins: {
    "@tailwindcss/postcss": {
      theme: {
        screens: {
          "mobile": "320px",
        },
        extend: {
          spacing: {
            "4.2": "1.05rem",
          },
        },
      },
    },
  },
};

export default config;
