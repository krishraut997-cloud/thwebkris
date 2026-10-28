# Google AdSense setup

Start or manage an AdSense account at [adsense.google.com/start](https://adsense.google.com/start/).
Add your deployed website to AdSense and wait for Google's site and account
approval. Localhost is for development; real ads generally require an approved
production site and ad units.

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
production site, follow Google's current consent, privacy, and site-approval
requirements for your audience and region.
