# Concert banners

Optional banner assets for NADAKITA LIVE. Admin uploads use Supabase Storage. Use high-resolution licensed photography; do not embed secret keys in asset URLs.

## Jakarta hero

`neon-jakarta-gbk-hero.png` is the user's supplied `Neon Jakarta Over GBK Stadium.png`,
copied unchanged on 11 October 2026. Treat it as an illustrative concert concept,
not documentary evidence of an event or an official venue endorsement.

`jakartaHero()` in `js/preview.js` renders a decorative native image and separate
HTML headline, CTA and date/venue. The user requested no academic note in the hero;
simulation notices remain in the footer and ticket sections. `css/jakarta-hero.css` provides
the dark overlay and responsive positioning without editing the source image.
Admin `hero_banner_url` can still replace the image via `js/live/app.js`.
