import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { gamePages, siteOrigin } from "./src/gameMeta.js";

const base = process.env.VITE_DEPLOY_TARGET === "github-pages" ? "/thwebkris/" : "/";

function upsertMeta(html, attribute, key, content) {
  const tag = `<meta ${attribute}="${key}" content="${content}" />`;
  const pattern = new RegExp(`<meta\\s+${attribute}="${key}"[^>]*\\/?>`, "i");
  return pattern.test(html)
    ? html.replace(pattern, tag)
    : html.replace("</head>", `    ${tag}\n  </head>`);
}

function createPage(template, { title, description, socialDescription, url, image, imageAlt }) {
  let html = String(template).replace(
    /<title>[\s\S]*?<\/title>/i,
    `<title>${title}</title>`,
  );
  for (const [attribute, key, content] of [
    ["name", "description", description],
    ["property", "og:type", "website"],
    ["property", "og:site_name", "Krish Raut"],
    ["property", "og:title", title],
    ["property", "og:description", socialDescription],
    ["property", "og:url", url],
    ["property", "og:image", image],
    ["property", "og:image:alt", imageAlt],
    ["name", "twitter:card", "summary_large_image"],
    ["name", "twitter:title", title],
    ["name", "twitter:description", socialDescription],
    ["name", "twitter:image", image],
  ]) {
    html = upsertMeta(html, attribute, key, content);
  }

  const canonical = `<link rel="canonical" href="${url}" />`;
  const pattern = /<link\s+rel="canonical"[^>]*\/?>/i;
  return pattern.test(html)
    ? html.replace(pattern, canonical)
    : html.replace("</head>", `    ${canonical}\n  </head>`);
}

function gamePageHtml() {
  return {
    name: "game-page-html",
    generateBundle: {
      order: "post",
      handler(_, bundle) {
        const indexPage = bundle["index.html"];
        if (!indexPage || indexPage.type !== "asset") {
          this.error("Could not find the built home page for game pages.");
        }

        const pages = [
          {
            fileName: "games/index.html",
            title: "Play Browser Games — Krish Raut",
            description: "Play four free browser games by Krish Raut, see recent player activity, and climb the weekly leaderboard.",
            socialDescription: "Play four free browser games by Krish Raut, see recent player activity, and climb the weekly leaderboard.",
            slug: "",
            image: "game-cards/game-platform.png",
            imageAlt: "Krish Raut's browser game collection and Python score platform",
          },
          ...gamePages.map((game) => ({
            fileName: `games/${game.slug}/index.html`,
            title: `${game.title} — Play by Krish Raut`,
            description: game.metaDescription,
            socialDescription: game.hook,
            slug: `${game.slug}/`,
            image: game.shareImage,
            imageAlt: `${game.title} browser game preview`,
          })),
        ];

        for (const page of pages) {
          const url = `${siteOrigin}${base}games/${page.slug}`;
          this.emitFile({
            type: "asset",
            fileName: page.fileName,
            source: createPage(indexPage.source, {
              title: page.title,
              description: page.description,
              socialDescription: page.socialDescription,
              url,
              image: `${siteOrigin}${base}${page.image}`,
              imageAlt: page.imageAlt,
            }),
          });
        }
      },
    },
  };
}

export default defineConfig({
  plugins: [react(), gamePageHtml()],
  base,
  server: {
    proxy: {
      "/api": "http://127.0.0.1:8000",
    },
  },
});
