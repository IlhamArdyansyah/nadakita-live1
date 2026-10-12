# Navigation regression checks

Run `python tests/test_navigation_browser.py` with Python Playwright installed and Google Chrome available at the executable path in the test.

The test serves the app locally and mocks Supabase responses with artificial latency. It checks 15 routes at 390px and 1440px, verifies stable heading text, dimensions, colors and fonts after page reveal, checks horizontal overflow and JavaScript exceptions, and clicks Discover This Night to verify the inline song player.

Dashboard and admin checks use logged-out states. These checks do not validate production Supabase data, authenticated permissions, payment flows, or actual audio playback; MP3 files must be supplied separately.

The navigation readiness gate waits for page initialization, local fonts and visible image decoding before a short opacity-only reveal. Static HTML links are prefetched on hover or focus. Network latency can still cause a loading interval; a recovery link is shown if initialization cannot complete.
