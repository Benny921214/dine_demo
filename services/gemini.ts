
import { GoogleGenAI } from "@google/genai";
import { Restaurant } from '../types';
import { MOCK_RESTAURANTS } from '../mockData';

// Prefer Vite-style env; fall back to process.env if present (SSR/tests)
const apiKey =
  (typeof __GEMINI_KEY__ !== 'undefined' && __GEMINI_KEY__) ||
  (import.meta as any)?.env?.VITE_GEMINI_API_KEY ||
  (import.meta as any)?.env?.GEMINI_API_KEY ||
  (typeof process !== 'undefined' ? process.env?.GEMINI_API_KEY || process.env?.API_KEY : undefined);

// Debug logging to confirm env injection in the browser build.
if (typeof window !== 'undefined') {
  // eslint-disable-next-line no-console
  console.log('[Gemini] import.meta.env snapshot', (import.meta as any)?.env);
  // eslint-disable-next-line no-console
  console.log('[Gemini] resolved apiKey', (import.meta as any)?.env?.VITE_GEMINI_API_KEY);
}

if (!apiKey) {
  console.error('[Gemini] Missing API key. Set VITE_GEMINI_API_KEY (or GEMINI_API_KEY/API_KEY) to enable search.');
}

const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

const SYSTEM_INSTRUCTION = `
You are a dining assistant API. 
When asked to find restaurants, use the Google Maps tool to find real places.
You MUST format your final response as a pure JSON string array of objects.
Do not include markdown formatting like \`\`\`json.

For each restaurant found via Google Maps, generate a JSON object with these exact fields:
- name: string (The exact business name)
- rating: number (e.g. 4.5)
- userRatingCount: number (e.g. 1200)
- address: string (full formatted address)
- description: string (short summary, max 20 words)
- type: string (e.g. "Italian", "Hot Pot")
- location: { lat: number, lng: number } (The geographical coordinates)
- regularOpeningHours: string (e.g. "Open 11am-9pm")
- nationalPhoneNumber: string
- googleMapsUri: string (The official Google Maps link)
- avgCostMin: number (Estimated minimum cost per person in TWD based on the specific restaurant's menu pricing or price level)
- avgCostMax: number (Estimated maximum cost per person in TWD)
- avgWaitMin: number (Estimated minimum wait time in minutes based on the restaurant's popularity and review count)
- avgWaitMax: number (Estimated maximum wait time in minutes)

Guidelines for Estimation if exact data is missing:
- Price: Inexpensive (~150 TWD), Moderate (~400 TWD), Expensive (~1000 TWD), Very Expensive (~2000+ TWD). Adjust based on the specific cuisine (e.g. Pasta vs Beef Noodle).
- Wait Time: High rating count (>1000) implies 30-60m wait. Low count implies 0-15m wait.
`;

// Haversine formula to calculate distance between two points in km
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return parseFloat(d.toFixed(1));
};

const deg2rad = (deg: number): number => {
  return deg * (Math.PI / 180);
};

const pickRandom = <T,>(arr: T[], limit: number): T[] => {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, limit);
};

export const searchRestaurants = async (
  locationOrArea: string | { lat: number; lng: number }, 
  query: string = "popular restaurants",
  limit: number = 10
): Promise<Restaurant[]> => {
  const fallback = (): Restaurant[] => {
    // Prefer same area for string searches; otherwise just pick top 10 mock entries.
    if (typeof locationOrArea === 'string') {
      const areaMatches = MOCK_RESTAURANTS.filter(r => r.area === locationOrArea);
      if (areaMatches.length > 0) return pickRandom(areaMatches, limit);
    }
    return pickRandom(MOCK_RESTAURANTS, limit);
  };

  if (!ai) {
    console.error('[Gemini] No API key configured; returning mock data.');
    return fallback();
  }
  try {
    let fullQuery = "";
    let retrievalConfig = undefined;
    let userLat = 0;
    let userLng = 0;
    let hasUserLocation = false;

    if (typeof locationOrArea === 'string') {
        fullQuery = `Find ${limit} ${query} in ${locationOrArea}. Include their exact coordinates, price, wait time, and official Google Maps link.`;
    } else {
        fullQuery = `Find ${limit} ${query} near my current location. Include their exact coordinates, price, wait time, and official Google Maps link.`;
        retrievalConfig = {
            latLng: {
                latitude: locationOrArea.lat,
                longitude: locationOrArea.lng
            }
        };
        userLat = locationOrArea.lat;
        userLng = locationOrArea.lng;
        hasUserLocation = true;
    }
    
    const requestConfig: any = {
        tools: [{ googleMaps: {} }],
        systemInstruction: SYSTEM_INSTRUCTION,
    };

    if (retrievalConfig) {
        requestConfig.toolConfig = {
            retrievalConfig: retrievalConfig
        };
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: fullQuery,
      config: requestConfig
    });

    const text = response.text || '';
    
    // Clean up potential markdown formatting
    const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    let parsedData: any[] = [];
    try {
        parsedData = JSON.parse(jsonString);
    } catch (e) {
        console.error("Failed to parse Gemini response as JSON", text);
        return [];
    }

    if (!Array.isArray(parsedData)) return [];

    // Map to our Restaurant Interface
    return parsedData.map((item, index) => {
        // Generate consistent ID
        const id = `gmaps_${Date.now()}_${index}`;
        const seed = (item.name?.length || 0) + index;
        
        // Resolve Location
        const placeLat = item.location?.lat || (hasUserLocation ? userLat + 0.01 : 24.8);
        const placeLng = item.location?.lng || (hasUserLocation ? userLng + 0.01 : 120.9);

        // Calculate Distance
        let dist = 0;
        if (hasUserLocation && item.location?.lat && item.location?.lng) {
            dist = calculateDistance(userLat, userLng, item.location.lat, item.location.lng);
        } else {
             // Fallback if we don't know where the user is (e.g. searching by Area Name only)
             dist = parseFloat((Math.random() * 3).toFixed(1)); 
        }
        
        return {
            id: id,
            name: item.name || "Unknown Restaurant",
            rating: item.rating || 0,
            distanceKm: dist,
            // Use model provided estimates, or fallback to safe defaults if model fails
            avgCostMin: item.avgCostMin || 150,
            avgCostMax: item.avgCostMax || 400,
            avgWaitMin: item.avgWaitMin || 0,
            avgWaitMax: item.avgWaitMax || 15,
            mealTimeHours: 1.5,
            hours: item.regularOpeningHours || 'Hours not available',
            address: item.address || `Address not available`,
            phone: item.nationalPhoneNumber || 'No phone',
            services: item.userRatingCount ? [`${item.userRatingCount} Reviews`] : [],
            foodTypes: [item.type || 'Restaurant'],
            seats: 40, 
            area: typeof locationOrArea === 'string' ? locationOrArea : 'Nearby',
            isOpen: true, 
            images: [
                `https://picsum.photos/800/600?random=${seed}`,
                `https://picsum.photos/800/600?random=${seed + 100}`
            ],
            description: item.description || `A popular ${item.type || 'place'} located at ${item.address}.`,
            lat: placeLat, 
            lng: placeLng,
            googleMapsUri: item.googleMapsUri
        };
    });

  } catch (error) {
    console.error("Gemini Search Error:", error);
    // Quota or network errors: return mock data so UI still works
    return fallback();
  }
};
