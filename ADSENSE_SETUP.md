# Google AdSense setup

Start or manage an AdSense account at [adsense.google.com/start](https://adsense.google.com/start/).
Add your deployed website to AdSense and wait for Google's site and account
approval. Localhost is for development; real ads generally require an approved
production site and ad units.

The site includes public About, Contact, Privacy Policy, and Terms pages. The
privacy policy explains Google advertising cookies, personalized ads, Google
sign-in, the public game leaderboard, and the third-party services used by the
site. The publisher verification meta tag and `public/ads.txt` are configured
for this AdSense account.

Create responsive display ad units for the portfolio and games pages. Put their
IDs and your publisher ID in the ignored `.env.local` file:

```env
VITE_ADSENSE_CLIENT=ca-pub-your-publisher-id
VITE_ADSENSE_HOME_SLOT=your-home-ad-slot-id
VITE_ADSENSE_GAMES_SLOT=your-games-ad-slot-id
```

Restart the Vite server after changing environment variables. The ad placements
stay hidden until the publisher ID and respective slot IDs are valid. Do not
click your own ads or encourage visitors to click them. Before enabling ads on a
production site, configure a Google-certified consent management platform in
AdSense Privacy & messaging for visitors in the EEA, UK, and Switzerland, and
follow Google's current consent, privacy, and site-approval requirements for
your audience and region. Adding these pages and verification files does not
guarantee approval; Google makes the final eligibility and review decisions.
