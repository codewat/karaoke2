import ytSearch from 'yt-search';

// Load API key from environment or user-provided key
const YOUTUBE_API_KEY =
  process.env.YOUTUBE_API_KEY || 'AIzaSyD241FoPLAePwbsP1HubJPugBLE5wVEsgw';

// In-memory cache to save quota on repeated searches
const searchCache = new Map();
const CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutes

/**
 * Clean & refine query to ensure only Karaoke / Videoke versions are returned
 */
export function buildKaraokeQuery(rawQuery, category = 'all') {
  let query = (rawQuery || '').trim();
  if (!query) return '';

  const lower = query.toLowerCase();
  const hasKaraokeWord = /(karaoke|videoke|minus[- ]?one|instrumental)/i.test(lower);

  // If user hasn't explicitly included karaoke terms, append them automatically
  let suffix = '';
  switch (category) {
    case 'opm':
      suffix = hasKaraokeWord ? 'opm' : 'opm karaoke videoke';
      break;
    case 'acoustic':
      suffix = hasKaraokeWord ? 'acoustic' : 'acoustic karaoke instrumental';
      break;
    case 'duet':
      suffix = hasKaraokeWord ? 'duet' : 'duet karaoke';
      break;
    default:
      suffix = hasKaraokeWord ? '' : 'karaoke';
      break;
  }

  if (suffix && !lower.includes(suffix.toLowerCase())) {
    query = `${query} ${suffix}`.trim();
  }

  return query;
}

/**
 * Main search function with YouTube Data API v3 (Embeddable Guaranteed) + Fallback
 */
export async function searchYouTube(rawQuery, category = 'all', limit = 20) {
  const searchQuery = buildKaraokeQuery(rawQuery, category);
  if (!searchQuery) return [];

  // Check cache
  const cacheKey = `${searchQuery.toLowerCase()}_${limit}`;
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  // 1. Try Official YouTube Data API v3 (guarantees videoEmbeddable=true)
  if (YOUTUBE_API_KEY) {
    try {
      const apiResults = await searchViaYouTubeAPI(searchQuery, YOUTUBE_API_KEY, limit);
      if (apiResults && apiResults.length > 0) {
        searchCache.set(cacheKey, { data: apiResults, timestamp: Date.now() });
        return apiResults;
      }
    } catch (err) {
      console.warn('YouTube Data API error, falling back to yt-search:', err.message);
    }
  }

  // 2. Fallback: yt-search library
  try {
    const results = await ytSearch(searchQuery);
    const videos = results.videos || [];

    const filtered = videos
      .filter((video) => {
        if (!video.videoId) return false;
        if (video.seconds && video.seconds > 960) return false;
        if (video.seconds && video.seconds < 30) return false;
        return true;
      })
      .slice(0, limit)
      .map((v) => ({
        id: v.videoId,
        title: cleanVideoTitle(v.title),
        author: v.author?.name || 'Karaoke Channel',
        duration: v.timestamp || formatSeconds(v.seconds || 0),
        seconds: v.seconds || 0,
        thumbnail: v.thumbnail || v.image || `https://i.ytimg.com/vi/${v.videoId}/mqdefault.jpg`,
        views: v.views || 0,
        ago: v.ago || ''
      }));

    searchCache.set(cacheKey, { data: filtered, timestamp: Date.now() });
    return filtered;
  } catch (error) {
    console.error('yt-search error:', error);
    return [];
  }
}

/**
 * Search using YouTube Data API v3 with videoEmbeddable=true filter
 */
async function searchViaYouTubeAPI(query, apiKey, limit = 20) {
  // videoEmbeddable=true guarantees that the video can be played in third-party website iframes!
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoEmbeddable=true&videoSyndicated=true&maxResults=${limit}&q=${encodeURIComponent(
    query
  )}&key=${apiKey}`;

  const res = await fetch(url);
  const data = await res.json();

  if (data.error) {
    throw new Error(data.error.message || 'YouTube API error');
  }

  const items = data.items || [];
  if (items.length === 0) return [];

  // Extract video IDs to fetch duration in a single lightweight batch request
  const videoIds = items.map((item) => item.id.videoId).filter(Boolean);
  const durationMap = await fetchVideoDurations(videoIds, apiKey);

  return items.map((item) => {
    const videoId = item.id.videoId;
    const snippet = item.snippet || {};
    const thumb =
      snippet.thumbnails?.medium?.url ||
      snippet.thumbnails?.high?.url ||
      `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;

    const durationInfo = durationMap[videoId] || { duration: '', seconds: 0 };

    return {
      id: videoId,
      title: cleanVideoTitle(snippet.title),
      author: snippet.channelTitle || 'Karaoke Channel',
      duration: durationInfo.duration,
      seconds: durationInfo.seconds,
      thumbnail: thumb,
      views: 0,
      ago: ''
    };
  });
}

/**
 * Batch fetch video durations using videos endpoint (only 1 quota unit)
 */
async function fetchVideoDurations(videoIds, apiKey) {
  if (!videoIds || videoIds.length === 0) return {};
  try {
    const url = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoIds.join(
      ','
    )}&key=${apiKey}`;
    const res = await fetch(url);
    const data = await res.json();

    const map = {};
    for (const item of data.items || []) {
      const iso = item.contentDetails?.duration;
      map[item.id] = parseISO8601Duration(iso);
    }
    return map;
  } catch (err) {
    console.warn('Failed to fetch video durations:', err.message);
    return {};
  }
}

/**
 * Parse ISO 8601 duration format (e.g. PT4M15S -> "4:15")
 */
function parseISO8601Duration(iso) {
  if (!iso) return { duration: '', seconds: 0 };
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return { duration: '', seconds: 0 };

  const hours = parseInt(match[1] || 0, 10);
  const minutes = parseInt(match[2] || 0, 10);
  const seconds = parseInt(match[3] || 0, 10);
  const totalSeconds = hours * 3600 + minutes * 60 + seconds;

  let formatted = '';
  if (hours > 0) {
    formatted = `${hours}:${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  } else {
    formatted = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  }

  return { duration: formatted, seconds: totalSeconds };
}

function cleanVideoTitle(title = '') {
  return title
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .trim();
}

function formatSeconds(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}
