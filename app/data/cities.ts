/* ============================================
   CELESTIA — City Database
   ~120 major cities worldwide with coordinates
   and UTC offsets. Good global coverage with
   emphasis on South/East Asia.
   ============================================ */

export interface CityEntry {
  /** Display name: "City, Country" */
  name: string;
  lat: number;
  lon: number;
  /** Standard UTC offset in hours (doesn't handle DST — acceptable for birth-sky) */
  utcOffset: number;
}

export const CITIES: CityEntry[] = [
  // ─── Sri Lanka ───
  { name: "Colombo, Sri Lanka", lat: 6.9271, lon: 79.8612, utcOffset: 5.5 },
  { name: "Kandy, Sri Lanka", lat: 7.2906, lon: 80.6337, utcOffset: 5.5 },
  { name: "Galle, Sri Lanka", lat: 6.0535, lon: 80.2210, utcOffset: 5.5 },
  { name: "Jaffna, Sri Lanka", lat: 9.6615, lon: 80.0255, utcOffset: 5.5 },
  { name: "Matara, Sri Lanka", lat: 5.9549, lon: 80.5550, utcOffset: 5.5 },
  { name: "Negombo, Sri Lanka", lat: 7.2008, lon: 79.8358, utcOffset: 5.5 },
  { name: "Trincomalee, Sri Lanka", lat: 8.5874, lon: 81.2152, utcOffset: 5.5 },
  { name: "Batticaloa, Sri Lanka", lat: 7.7310, lon: 81.6747, utcOffset: 5.5 },
  { name: "Anuradhapura, Sri Lanka", lat: 8.3114, lon: 80.4037, utcOffset: 5.5 },
  { name: "Kurunegala, Sri Lanka", lat: 7.4867, lon: 80.3647, utcOffset: 5.5 },

  // ─── China ───
  { name: "Beijing, China", lat: 39.9042, lon: 116.4074, utcOffset: 8 },
  { name: "Shanghai, China", lat: 31.2304, lon: 121.4737, utcOffset: 8 },
  { name: "Guangzhou, China", lat: 23.1291, lon: 113.2644, utcOffset: 8 },
  { name: "Shenzhen, China", lat: 22.5431, lon: 114.0579, utcOffset: 8 },
  { name: "Chengdu, China", lat: 30.5728, lon: 104.0668, utcOffset: 8 },
  { name: "Wuhan, China", lat: 30.5928, lon: 114.3055, utcOffset: 8 },
  { name: "Hangzhou, China", lat: 30.2741, lon: 120.1551, utcOffset: 8 },
  { name: "Xi'an, China", lat: 34.3416, lon: 108.9398, utcOffset: 8 },
  { name: "Chongqing, China", lat: 29.4316, lon: 106.9123, utcOffset: 8 },
  { name: "Nanjing, China", lat: 32.0603, lon: 118.7969, utcOffset: 8 },
  { name: "Tianjin, China", lat: 39.3434, lon: 117.3616, utcOffset: 8 },
  { name: "Suzhou, China", lat: 31.2990, lon: 120.5853, utcOffset: 8 },
  { name: "Dalian, China", lat: 38.9140, lon: 121.6147, utcOffset: 8 },
  { name: "Qingdao, China", lat: 36.0671, lon: 120.3826, utcOffset: 8 },
  { name: "Kunming, China", lat: 25.0389, lon: 102.7183, utcOffset: 8 },
  { name: "Harbin, China", lat: 45.8038, lon: 126.5350, utcOffset: 8 },
  { name: "Changsha, China", lat: 28.2282, lon: 112.9388, utcOffset: 8 },
  { name: "Zhengzhou, China", lat: 34.7466, lon: 113.6254, utcOffset: 8 },
  { name: "Fuzhou, China", lat: 26.0745, lon: 119.2965, utcOffset: 8 },
  { name: "Xiamen, China", lat: 24.4798, lon: 118.0894, utcOffset: 8 },
  { name: "Ürümqi, China", lat: 43.8256, lon: 87.6168, utcOffset: 8 },
  { name: "Lhasa, China", lat: 29.6500, lon: 91.1000, utcOffset: 8 },
  { name: "Hong Kong", lat: 22.3193, lon: 114.1694, utcOffset: 8 },
  { name: "Macau", lat: 22.1987, lon: 113.5439, utcOffset: 8 },

  // ─── India ───
  { name: "New Delhi, India", lat: 28.6139, lon: 77.2090, utcOffset: 5.5 },
  { name: "Mumbai, India", lat: 19.0760, lon: 72.8777, utcOffset: 5.5 },
  { name: "Bangalore, India", lat: 12.9716, lon: 77.5946, utcOffset: 5.5 },
  { name: "Chennai, India", lat: 13.0827, lon: 80.2707, utcOffset: 5.5 },
  { name: "Kolkata, India", lat: 22.5726, lon: 88.3639, utcOffset: 5.5 },
  { name: "Hyderabad, India", lat: 17.3850, lon: 78.4867, utcOffset: 5.5 },

  // ─── Southeast Asia ───
  { name: "Singapore", lat: 1.3521, lon: 103.8198, utcOffset: 8 },
  { name: "Bangkok, Thailand", lat: 13.7563, lon: 100.5018, utcOffset: 7 },
  { name: "Kuala Lumpur, Malaysia", lat: 3.1390, lon: 101.6869, utcOffset: 8 },
  { name: "Jakarta, Indonesia", lat: -6.2088, lon: 106.8456, utcOffset: 7 },
  { name: "Manila, Philippines", lat: 14.5995, lon: 120.9842, utcOffset: 8 },
  { name: "Ho Chi Minh City, Vietnam", lat: 10.8231, lon: 106.6297, utcOffset: 7 },
  { name: "Hanoi, Vietnam", lat: 21.0285, lon: 105.8542, utcOffset: 7 },

  // ─── East Asia ───
  { name: "Tokyo, Japan", lat: 35.6762, lon: 139.6503, utcOffset: 9 },
  { name: "Osaka, Japan", lat: 34.6937, lon: 135.5023, utcOffset: 9 },
  { name: "Seoul, South Korea", lat: 37.5665, lon: 126.9780, utcOffset: 9 },
  { name: "Taipei, Taiwan", lat: 25.0330, lon: 121.5654, utcOffset: 8 },

  // ─── Middle East ───
  { name: "Dubai, UAE", lat: 25.2048, lon: 55.2708, utcOffset: 4 },
  { name: "Abu Dhabi, UAE", lat: 24.4539, lon: 54.3773, utcOffset: 4 },
  { name: "Doha, Qatar", lat: 25.2854, lon: 51.5310, utcOffset: 3 },
  { name: "Riyadh, Saudi Arabia", lat: 24.7136, lon: 46.6753, utcOffset: 3 },
  { name: "Istanbul, Turkey", lat: 41.0082, lon: 28.9784, utcOffset: 3 },
  { name: "Tehran, Iran", lat: 35.6892, lon: 51.3890, utcOffset: 3.5 },

  // ─── Europe ───
  { name: "London, UK", lat: 51.5074, lon: -0.1278, utcOffset: 0 },
  { name: "Paris, France", lat: 48.8566, lon: 2.3522, utcOffset: 1 },
  { name: "Berlin, Germany", lat: 52.5200, lon: 13.4050, utcOffset: 1 },
  { name: "Madrid, Spain", lat: 40.4168, lon: -3.7038, utcOffset: 1 },
  { name: "Rome, Italy", lat: 41.9028, lon: 12.4964, utcOffset: 1 },
  { name: "Amsterdam, Netherlands", lat: 52.3676, lon: 4.9041, utcOffset: 1 },
  { name: "Moscow, Russia", lat: 55.7558, lon: 37.6173, utcOffset: 3 },
  { name: "Stockholm, Sweden", lat: 59.3293, lon: 18.0686, utcOffset: 1 },
  { name: "Vienna, Austria", lat: 48.2082, lon: 16.3738, utcOffset: 1 },
  { name: "Zurich, Switzerland", lat: 47.3769, lon: 8.5417, utcOffset: 1 },
  { name: "Dublin, Ireland", lat: 53.3498, lon: -6.2603, utcOffset: 0 },
  { name: "Lisbon, Portugal", lat: 38.7223, lon: -9.1393, utcOffset: 0 },
  { name: "Athens, Greece", lat: 37.9838, lon: 23.7275, utcOffset: 2 },
  { name: "Warsaw, Poland", lat: 52.2297, lon: 21.0122, utcOffset: 1 },
  { name: "Prague, Czech Republic", lat: 50.0755, lon: 14.4378, utcOffset: 1 },

  // ─── Africa ───
  { name: "Cairo, Egypt", lat: 30.0444, lon: 31.2357, utcOffset: 2 },
  { name: "Lagos, Nigeria", lat: 6.5244, lon: 3.3792, utcOffset: 1 },
  { name: "Nairobi, Kenya", lat: -1.2921, lon: 36.8219, utcOffset: 3 },
  { name: "Cape Town, South Africa", lat: -33.9249, lon: 18.4241, utcOffset: 2 },
  { name: "Johannesburg, South Africa", lat: -26.2041, lon: 28.0473, utcOffset: 2 },
  { name: "Casablanca, Morocco", lat: 33.5731, lon: -7.5898, utcOffset: 1 },
  { name: "Addis Ababa, Ethiopia", lat: 9.0250, lon: 38.7469, utcOffset: 3 },

  // ─── North America ───
  { name: "New York, USA", lat: 40.7128, lon: -74.0060, utcOffset: -5 },
  { name: "Los Angeles, USA", lat: 34.0522, lon: -118.2437, utcOffset: -8 },
  { name: "Chicago, USA", lat: 41.8781, lon: -87.6298, utcOffset: -6 },
  { name: "Houston, USA", lat: 29.7604, lon: -95.3698, utcOffset: -6 },
  { name: "San Francisco, USA", lat: 37.7749, lon: -122.4194, utcOffset: -8 },
  { name: "Washington D.C., USA", lat: 38.9072, lon: -77.0369, utcOffset: -5 },
  { name: "Toronto, Canada", lat: 43.6532, lon: -79.3832, utcOffset: -5 },
  { name: "Vancouver, Canada", lat: 49.2827, lon: -123.1207, utcOffset: -8 },
  { name: "Mexico City, Mexico", lat: 19.4326, lon: -99.1332, utcOffset: -6 },

  // ─── South America ───
  { name: "São Paulo, Brazil", lat: -23.5505, lon: -46.6333, utcOffset: -3 },
  { name: "Buenos Aires, Argentina", lat: -34.6037, lon: -58.3816, utcOffset: -3 },
  { name: "Lima, Peru", lat: -12.0464, lon: -77.0428, utcOffset: -5 },
  { name: "Bogotá, Colombia", lat: 4.7110, lon: -74.0721, utcOffset: -5 },
  { name: "Santiago, Chile", lat: -33.4489, lon: -70.6693, utcOffset: -4 },
  { name: "Rio de Janeiro, Brazil", lat: -22.9068, lon: -43.1729, utcOffset: -3 },

  // ─── Oceania ───
  { name: "Sydney, Australia", lat: -33.8688, lon: 151.2093, utcOffset: 10 },
  { name: "Melbourne, Australia", lat: -37.8136, lon: 144.9631, utcOffset: 10 },
  { name: "Auckland, New Zealand", lat: -36.8485, lon: 174.7633, utcOffset: 12 },
  { name: "Perth, Australia", lat: -31.9505, lon: 115.8605, utcOffset: 8 },

  // ─── Pakistan / Bangladesh / Nepal ───
  { name: "Karachi, Pakistan", lat: 24.8607, lon: 67.0011, utcOffset: 5 },
  { name: "Lahore, Pakistan", lat: 31.5204, lon: 74.3587, utcOffset: 5 },
  { name: "Islamabad, Pakistan", lat: 33.6844, lon: 73.0479, utcOffset: 5 },
  { name: "Dhaka, Bangladesh", lat: 23.8103, lon: 90.4125, utcOffset: 6 },
  { name: "Kathmandu, Nepal", lat: 27.7172, lon: 85.3240, utcOffset: 5.75 },

  // ─── Maldives ───
  { name: "Malé, Maldives", lat: 4.1755, lon: 73.5093, utcOffset: 5 },
];

/**
 * Fuzzy search cities by name. Case-insensitive substring match.
 * Returns up to `limit` results sorted by relevance (prefix match first).
 */
export function searchCities(query: string, limit = 8): CityEntry[] {
  if (!query.trim()) return [];

  const q = query.toLowerCase().trim();

  // Score: 0 = starts with query, 1 = word boundary match, 2 = substring match
  const scored: { city: CityEntry; score: number }[] = [];

  for (const city of CITIES) {
    const name = city.name.toLowerCase();

    if (name.startsWith(q)) {
      scored.push({ city, score: 0 });
    } else if (
      name.includes(`, ${q}`) ||
      name.split(/[\s,]+/).some((w) => w.startsWith(q))
    ) {
      scored.push({ city, score: 1 });
    } else if (name.includes(q)) {
      scored.push({ city, score: 2 });
    }
  }

  scored.sort((a, b) => a.score - b.score);
  return scored.slice(0, limit).map((s) => s.city);
}
