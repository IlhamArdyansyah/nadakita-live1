# Artist photos for NADAKITA LIVE

Place your own authentic, appropriately licensed artist photos here:

- `the-weeknd.jpg` — Night 01
- `justin-bieber.jpg` — Night 02
- `bruno-mars.jpg` — Night 03

Keep filenames lowercase and exactly as above. JPG/JPEG format is expected by the built-in local fallback. For best presentation, use portrait photos cropped around **3:4** (suggested 1200×1600 px), optimized to reasonable file sizes. Do not upload AI-generated or unauthorized artist likenesses.

The **The Shows** cards and concert detail pages reference these local files automatically. If a file is absent, the branded color placeholder stays visible. This is intentional; no sample real photographs are included in the ZIP.

When Supabase is configured, artists.image_path points to these paths in the seed SQL (or run migration 004 if you previously ran 003). Admin-uploaded images in Supabase Storage can override the local photo.
