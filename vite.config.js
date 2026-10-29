import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { gamePages } from "./src/gameMeta.js";

const defaultSiteOrigin = "https://krishraut997-cloud.github.io";

function upsertMeta(html, attribute, key, content) {
  const tag = `<meta ${attribute}="${key}" content="${content}" />`;
  const pattern = new RegExp(`<meta\\s+${attribute}="${key}"[^>]*\\/?>`, "i");
  return pattern.test(html)
    ? html.replace(pattern, tag)
    : html.replace("</head>", `    ${tag}\n  </head>`);
}

function upsertCanonical(html, url) {
  const canonical = `<link rel="canonical" href="${url}" />`;
  const pattern = /<link\s+rel="canonical"[^>]*\/?>/i;
  return pattern.test(html)
    ? html.replace(pattern, canonical)
    : html.replace("</head>", `    ${canonical}\n  </head>`);
}

function upsertAdSenseScript(html, publisherId) {
  const script = `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${publisherId}" crossorigin="anonymous"></script>`;
  const pattern = /<script\b(?=[^>]*\bsrc=["']https:\/\/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js[^"']*["'])[^>]*>\s*<\/script>/i;
  return pattern.test(html)
    ? html.replace(pattern, script)
    : html.replace("</head>", `    ${script}\n  </head>`);
}

function createPage(template, {
  title,
  description,
  socialDescription,
  url,
  image,
  imageAlt,
  publisherId,
  adsEnabled,
}) {
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
    ["name", "google-adsense-account", publisherId],
  ]) {
    html = upsertMeta(html, attribute, key, content);
  }

  if (adsEnabled) {
    html = upsertAdSenseScript(html, publisherId);
  }

  return upsertCanonical(html, url);
}

function gamePageHtml({ adsEnabled, base, publisherId, siteOrigin }) {
  const publicFile = (name) => readFileSync(resolve(process.cwd(), "public", name), "utf8");

  return {
    name: "game-page-html",
    generateBundle: {
      order: "post",
      handler(_, bundle) {
        const indexPage = bundle["index.html"];
        if (!indexPage || indexPage.type !== "asset") {
          this.error("Could not find the built home page for game pages.");
        }

        const siteBaseUrl = `${siteOrigin}${base}`;
        let homeHtml = String(indexPage.source);
        for (const [attribute, key, content] of [
          ["name", "google-adsense-account", publisherId],
          ["property", "og:url", siteBaseUrl],
          ["property", "og:image", `${siteBaseUrl}game-cards/game-platform.png`],
          ["name", "twitter:image", `${siteBaseUrl}game-cards/game-platform.png`],
        ]) {
          homeHtml = upsertMeta(homeHtml, attribute, key, content);
        }
        if (adsEnabled) {
          homeHtml = upsertAdSenseScript(homeHtml, publisherId);
        }
        indexPage.source = upsertCanonical(homeHtml, siteBaseUrl);

        for (const pageName of ["about.html", "contact.html", "privacy-policy.html", "terms.html"]) {
          let html = upsertMeta(publicFile(pageName), "name", "google-adsense-account", publisherId);
          if (adsEnabled) {
            html = upsertAdSenseScript(html, publisherId);
          }
          this.emitFile({
            type: "asset",
            fileName: pageName,
            source: upsertCanonical(html, `${siteBaseUrl}${pageName}`),
          });
        }

        const adsTxt = publicFile("ads.txt").replace(
          /^google\.com,\s*pub-\d+,\s*DIRECT,/m,
          `google.com, ${publisherId.slice(3)}, DIRECT,`,
        );
        this.emitFile({ type: "asset", fileName: "ads.txt", source: adsTxt });

        const sitemap = publicFile("sitemap.xml").replaceAll(
          `${defaultSiteOrigin}/thwebkris/`,
          siteBaseUrl,
        );
        this.emitFile({ type: "asset", fileName: "sitemap.xml", source: sitemap });

        const robots = publicFile("robots.txt").replace(
          /^Sitemap:.*$/m,
          `Sitemap: ${siteBaseUrl}sitemap.xml`,
        );
        this.emitFile({ type: "asset", fileName: "robots.txt", source: robots });

        const pages = [
          {
            fileName: "games/index.html",
            title: "Play Browser Games — Krish Raut",
            description: "Play four free browser games by Krish Raut and climb the weekly leaderboard.",
            socialDescription: "Play four free browser games by Krish Raut and climb the weekly leaderboard.",
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
              publisherId,
              adsEnabled,
            }),
          });
        }
      },
    },
  };
}

export default defineConfig(({ mode }) => {
  const environment = {
    ...loadEnv(mode, process.cwd(), ""),
    ...process.env,
  };
  const base = environment.VITE_DEPLOY_TARGET === "github-pages" ? "/thwebkris/" : "/";
  const siteOrigin = (
    environment.VITE_SITE_ORIGIN ||
    (environment.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${environment.VERCEL_PROJECT_PRODUCTION_URL}`
      : defaultSiteOrigin)
  ).replace(/\/+$/, "");
  const publisherId = environment.VITE_ADSENSE_CLIENT || "ca-pub-6509336973455037";
  const adsEnabled =
    Boolean(environment.VITE_ADSENSE_CLIENT) &&
    environment.VITE_ADSENSE_CONSENT_CONFIGURED === "true";

  if (!/^https:\/\/[^/]+$/.test(siteOrigin)) {
    throw new Error("VITE_SITE_ORIGIN must be an HTTPS origin without a path.");
  }

  if (!/^ca-pub-\d+$/.test(publisherId)) {
    throw new Error("VITE_ADSENSE_CLIENT must be a valid AdSense publisher ID.");
  }

  return {
    plugins: [react(), gamePageHtml({ adsEnabled, base, publisherId, siteOrigin })],
    base,
    server: {
      proxy: {
        "/api": "http://127.0.0.1:8000",
      },
    },
  };
});
