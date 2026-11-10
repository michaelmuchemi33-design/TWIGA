import { defineConfig } from "vite";

// TWIGA is a small multi-page site: public landing page, legal pages and
// the password-authenticated platform-admin portal must all ship in dist.
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: "index.html",
        privacy: "privacy.html",
        terms: "terms.html",
        admin: "admin/index.html",
      },
    },
  },
});
