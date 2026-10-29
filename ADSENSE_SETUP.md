# Google AdSense readiness

The site has responsive ad placements, an AdSense publisher verification tag,
an `ads.txt` file, crawlable public information pages, and a sitemap. The ad
placements remain absent until valid publisher and consent-setup values are
supplied. The standard (non-AMP) Auto ads script is added to page heads after
both are configured; Auto ads must also be enabled in the AdSense account.
Manual responsive ad units remain optional.
This repository cannot enable the AdSense account, publish a consent message,
or guarantee Google's review approval.

This is a React/Vite website, not an AMP site. Use the standard AdSense Auto ads
snippet; do not add AMP-only `<amp-auto-ads>` markup or AMP extensions to these
pages.

## Important: choose the production site URL

AdSense expects `ads.txt` at the root of the site submitted for review. The
GitHub Pages project URL
`https://krishraut997-cloud.github.io/thwebkris/` serves its file at
`/thwebkris/ads.txt`, while `https://krishraut997-cloud.github.io/ads.txt`
returns 404. Do not submit the GitHub Pages project path as if its ads.txt were
at the host root.

The current Vercel production host serves `ads.txt` at its root:
`https://portfolio-seven-green-mocmyyk3ff.vercel.app/ads.txt`. You can use that
host for the AdSense site review, or preferably connect a custom domain and
serve the site and `ads.txt` at that domain's root. The build sets the
canonical URLs and sitemap to the Vercel production host when Vercel provides
`VERCEL_PROJECT_PRODUCTION_URL`; otherwise it uses `VITE_SITE_ORIGIN`.
`VITE_SITE_ORIGIN` must be an HTTPS origin without a path. GitHub Pages sets it
to `https://krishraut997-cloud.github.io` and keeps the project path in its
build base.

## Account and hosting steps

1. In AdSense, add the production site you chose and follow its ownership and
   site-review steps. The verification meta tag and `ads.txt` publisher line
   are generated from `VITE_ADSENSE_CLIENT`; the default matches the current
   publisher ID already recorded in `public/ads.txt`.
2. In AdSense **Privacy & messaging**, publish a Google-certified consent
   message for the EEA, UK, and Switzerland, and configure any additional
   consent messages required for your audience and applicable law. Follow
   AdSense's installation instructions. Add any generated CMP code to
   `index.html` and the static pages under `public/`; generated game pages
   inherit the head snippet from `index.html`. Ensure the CMP code runs before
   the AdSense script.
3. Configure these public build variables in Vercel's Production environment
   and in GitHub repository **Settings → Secrets and variables → Actions →
   Variables** (not as secrets):

   ```env
   VITE_ADSENSE_CLIENT=ca-pub-your-publisher-id
   VITE_ADSENSE_CONSENT_CONFIGURED=true
   ```

   Set `VITE_SITE_ORIGIN` in Vercel if its production domain is not detected
   automatically. If you also use the manual Display ad units, set
   `VITE_ADSENSE_HOME_SLOT` and `VITE_ADSENSE_GAMES_SLOT` to those unit IDs.
   Set `VITE_ADSENSE_CONSENT_CONFIGURED=true` only after the CMP has been
   published and installed. For local development, put the values in the
   ignored `.env.local` file.
4. In AdSense, enable Auto ads for the approved site if you want automatic
   placements. Create responsive Display ad units only if you also want the
   existing manual portfolio and game placements.
5. Redeploy both hosts after setting their variables. Check the AdSense site
   status, verify the `ads.txt` status in AdSense, and confirm the ad units
   appear on the deployed pages. Ad serving may take time after approval.

The privacy policy describes Google advertising cookies, personalized ads,
sign-in, the public leaderboard, and the third-party services used by the
site. The About, Contact, Privacy Policy, and Terms pages are linked from the
site. The game and portfolio ad units are clearly labelled "Advertisement" and
load only near the viewport. Never click your own ads or ask visitors to click
them. Keep ads separate from game controls and useful content.

Google requires original, useful content, clear navigation, policy-compliant
traffic, and an eligible account (the applicant must be at least 18, or a
parent/guardian must apply on behalf of a minor). These implementation checks
do not guarantee acceptance; Google makes the final eligibility and review
decisions. See [AdSense site readiness](https://support.google.com/adsense/answer/7299563),
[program policies](https://support.google.com/adsense/answer/48182), and
[privacy requirements](https://support.google.com/adsense/answer/1348695).
