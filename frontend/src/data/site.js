// TREV (trevworld.com) — site content. Real copy pulled from the live
// trevworld.com (Home, Press, Contact pages) on 2026-10-13. Anything not on the
// live site is flagged below as a placeholder rather than invented.

export const ARTIST_NAME = "TREV";
export const SITE_LOCATION = "Based in San Diego · Deep roots in Utah";

// Top-level navigation (multi-page routes).
export const NAV_LINKS = [
  { label: "Home", to: "/" },
  { label: "About", to: "/about" },
  { label: "Music", to: "/music" },
  { label: "Gallery", to: "/gallery" },
  { label: "Community", to: "/community" },
  { label: "Tour", to: "/tour" },
  { label: "Shop", to: "/shop" },
  { label: "EPK", to: "/epk" },
  { label: "Contact", to: "/contact" },
];

// Label — footer credit on the live site: "© 2026 TREV - SOVEREIGNTREE RECORDS".
export const LABEL_NAME = "SovereignTree Records";
export const SOVEREIGNTREE_URL = "https://sovereigntree.org";

export const SITE_TAGLINE = "Music for the Kingdom Within";
export const HOME_TAGLINE_LINES = ["Music for the", "Kingdom Within"]; // homepage hero, under the logo
export const MUSIC_TAGLINE_LINES = ["Music for the", "Inner Kingdom"]; // Music page title
export const SITE_GENRE_TAGS = "CONSCIOUS HIP-HOP | SPOKEN WORD | PRAYERFORMANCE";
export const KINGDOM_LINE = "The Kingdom is Within You.";

// Bio — verbatim from trevworld.com/epk ("BIO").
export const BIO = [
  "TREV is a Conscious Hip-Hop Artist using the infinite power of the spoken word to activate the awakening of humanity.",
  "Inspired by artists like J. Cole and Brother Ali, and guided by teachers like Ram Dass and Yogananda, his music weaves heart-opening, masterful poetry over cinematic, head-nodding beats, blending loving truths, dynamic wordplay, and empowering affirmations into a meditative, ceremonial, and deeply interactive experience - a prayerformance that invites presence, connection, and inspiration.",
  "His prayer - and his decree - is that his music supports people in taking massive inspired action toward the New Earth from a place of ultimate alignment.",
  "Based in San Diego, California, with deep roots in Utah, TREV is touring the U.S. full-time, building community.",
];

// Short hero/intro line (first sentence of the bio).
export const HERO_BIO = BIO[0];
export const HERO_BIO_MOBILE = BIO[0];

export const SOCIALS = [
  { label: "Instagram", href: "https://www.instagram.com/trevmental/" },
  { label: "YouTube", href: "https://www.youtube.com/@trevmental" },
  { label: "TikTok", href: "https://www.tiktok.com/@trevmental" },
];

// "Unlock the Kingdom" — TREV's real Laylo list (from the live homepage).
export const LAYLO_URL = "https://laylo.com/trevofficial/TdPmXH";
export const LAYLO_CTA = "Unlock the Kingdom";

// Text-to-join line from the end of the Kingdom music video.
export const TEXT_KEYWORD = "KINGDOM";
export const TEXT_NUMBER = "858-877-9751";
export const TEXT_SMS_HREF = "sms:+18588779751?&body=KINGDOM";

// Patreon (from the live homepage).
export const PATREON_URL = "https://www.patreon.com/TREVMENTALFAM/gift";
export const COMMUNITY_LINKS = [{ label: "Patreon", href: PATREON_URL }];

// Contact — the live site lists one address for everything.
export const SITE_CONTACT = { email: "trevmentalrap@gmail.com" };
export const BOOKING_EMAIL = "trevmentalrap@gmail.com";

// Booking form backend (Formspree, as on Sierra's and Jenn's sites): the EPK and Contact booking forms
// post here. A failed request falls back to a pre-filled email (MailtoFallback).
export const FORMSPREE_ENDPOINT = "https://formspree.io/f/mgaanove";

// EPK — stats and highlights verbatim from the live Home and Press pages.
export const EPK_STATS = [
  { value: "1.25M", label: "Streams/Views Across Platforms" },
  { value: "500+", label: "Live Performances Nationwide" },
  { value: "10+", label: "Years Making/Performing Music" },
  { value: "1.5M+", label: "Views on Instagram" },
];
export const CAREER_HIGHLIGHTS = [
  "500+ Live Performances Nationwide",
  "Featured on Tour with SatSang, Paul Izak, Tubby Love",
  "1.5M+ Views on Instagram",
];
export const EPK_TOURED_WITH = ["SatSang", "Paul Izak", "Tubby Love"];
// "Direct Support For" on the EPK
export const SHARED_STAGE = [
  "Talib Kweli",
  "Ghostface Killah",
  "Living Legends",
  "Sa-Roc",
  "Shanin Blake",
  "Hieroglyphics",
  "FR33SOL",
  "Mike Love",
];
export const FESTIVALS = [
  "Shangri-La",
  "Unison Festival",
  "Yin on Fire Festival",
  "Frequency One Festival",
  "Aligned Awakening",
  "Earth Vibe Fest",
  "Shilajam",
];
export const EPK_BANNER_TEXT = "Live prayerformance";

// Booking — verbatim from trevworld.com/contact.
export const BOOKING_STATUS = "Now Booking for 2027";
export const BOOKING_COPY = "Festivals, retreats, private events, and conscious gatherings worldwide.";

// Tour — the 2026 Kingdom Tour is over; one more show this year (from the Facebook event TREV sent).
export const TOUR_STATUS = "The final leg of the\n2026 Kingdom Tour";
export const TOUR_DATES = [
  {
    date: "Nov 20",
    event: "TREV with Sierra Marin & Burnell Washburn",
    location: "The Harp · Ocean Beach, San Diego",
    note: "Friday, November 20, 2026 · $5 at the door",
  },
  {
    date: "Nov 27",
    event: "The Giving Room Experiment with Tubby Love & Friends",
    location: "The Fox Theatre · Boulder, CO",
    note: "Friday, November 27, 2026 · 7 PM · A benefit concert for the Four Winds Foundation & Lodge of the Great Spirit",
    url: "https://www.facebook.com/events/2578814615875623/",
    cta: "Event Details",
  },
];
export const TOUR_TICKETS_URL = null;
export const TOUR_INTRO_LINE_1 = "Building community,";
export const TOUR_INTRO_LINE_2 = "one prayerformance at a time.";

export const HERO_TAGLINE = SITE_TAGLINE;
export const HERO_CTA = { label: "My Story", to: "/about" };

// Merch lives on Etsy.
export const SHOP_URL = "https://www.etsy.com/shop/TrevMentalMerch";

// Streaming — artist-level links from the live homepage.
export const SPOTIFY_ARTIST_ID = "5sqnjjc87Mzyzaldxt9cEV";
export const SPOTIFY_ARTIST_URL = `https://open.spotify.com/artist/${SPOTIFY_ARTIST_ID}`;
export const MUSIC_PLATFORM_LINKS = [
  { label: "Spotify", href: SPOTIFY_ARTIST_URL },
  { label: "Apple Music", href: "https://music.apple.com/us/artist/trevmental/1713981177" },
  { label: "YouTube", href: "https://www.youtube.com/@trevmental" },
  { label: "Bandcamp", href: "https://trevworld.bandcamp.com" },
];

// EPK: the pills under the player (the same artist links as above)
export const STREAMING_LINKS = MUSIC_PLATFORM_LINKS;

// EPK player: his own files (not Spotify's embed: 30-second previews to anyone logged out, no skip).
// duration (seconds) shows each song's length before it loads.
export const EPK_TRACKS = [
  { title: "The Essence", src: "/tracks/the-essence.mp3", duration: 288 },
  { title: "Most High", src: "/tracks/most-high.mp3", duration: 145 },
];
export const ALBUM_COVER = "/tracks/the-essence-cover.jpg";   // (a stand-in from his live photos until The Essence has its own art)

// EPK video: a live performance (YouTube) leads once there is one; until then the highlight reel
// (public/trev-epk-reel.mp4, hidden while it doesn't exist). { youtubeId: "...", title: "Live at ..." }
export const EPK_PERFORMANCE_VIDEO = null;

// EPK press quotes: { quote, source, href? }. The section shows once there's at least one.
export const PRESS_QUOTES = [];

// EPK stage plot & tech rider, from TREV's "Celebrate Life Together" stage plot & input list.
// setLength, changeover and monitors are optional (each line hides while it's null).
export const TECH_RIDER = {
  show: null,
  lineup: "Lead vocal (wireless), backup vocal, guitar and stereo playback from laptop",
  setLength: "45–90 minutes",
  changeover: "15 minutes changeover · 30 minutes soundcheck",
  inputs: [
    { ch: 1, source: "Stereo output L", mic: '1/4" line output' },
    { ch: 2, source: "Stereo output R", mic: '1/4" line output' },
    { ch: 3, source: "Lead vocal", mic: "Artist-provided wireless mic receiver → DI" },
    { ch: 4, source: "Backup vocal", mic: "Venue-provided wired vocal mic" },
    { ch: 5, source: "Guitar", mic: 'DI input (1/4")' },
  ],
  monitors: null,
  venueProvides: [
    "1 wired backup vocal microphone",
    "1 backup vocal mic stand",
    "1 lead vocal mic stand",
    "1 stool (for the artist)",
    "1 small table (for laptop / interface)",
    "1 DI for the wireless vocal receiver",
    "1 DI for guitar",
    'Inputs to FOH for the artist\'s stereo outputs (2 × 1/4" L/R)',
    "1 power outlet at the performance position",
  ],
  artistBrings: ["Wireless lead vocal mic and receiver", 'Laptop / interface with stereo outputs (2 × 1/4" L/R)'],
};

// Featured release: "Kingdom". The Music page plays a 20-second preview of the official video, then
// asks people to "Get the full video" via the Laylo list (LAYLO_URL), which gates the full video.
// File: public/trev-kingdom-preview.mp4 (TREV's "Kingdom official preview"), poster: trev-kingdom-preview.jpg.
export const KINGDOM_PREVIEW = {
  src: "/trev-kingdom-preview.mp4",
  poster: "/trev-entry-hero-end.jpg",
  seconds: 20,
};

export const TRACKING_PIXEL_IDS = {
  metaPixelId: null,
  googleAnalyticsId: null,
};

// About page opening emblem. null = the TREV wordmark. Set to the lion symbol (e.g. "/trev-lion.png")
// once it's in public/, so the wordmark isn't repeated between the homepage and About.
export const ABOUT_EMBLEM = null;
