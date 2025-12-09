
export interface Restaurant {
  id: string;
  name: string;
  rating: number;
  distanceKm: number;
  avgCostMin: number;
  avgCostMax: number;
  avgWaitMin: number;
  avgWaitMax: number;
  mealTimeHours: number;
  hours: string;
  address: string;
  phone: string;
  services: string[];
  foodTypes: string[];
  seats: number;
  area: string;
  isOpen: boolean;
  images: string[];
  description: string;
  lat: number;
  lng: number;
  googleMapsUri?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  isHost?: boolean;
}

export interface Group {
  id: string;
  name: string;
  note: string;
  area: string;
  date: string;
  time: string;
  swipingAmount: number;
  isVegetarian: boolean;
  members: UserProfile[]; // Updated to store full profiles
  inviteLink: string;
  idealPriceRange: string;
  maxWaitTime: string;
  anonymousVoting?: boolean;
}

export interface SelectionResult {
  id: string;
  groupId: string;
  timestamp: number;
  type: 'MATCH' | 'VOTE';
  restaurantId?: string; // If type is MATCH
  likes?: string[];      // If type is VOTE (list of liked restaurant IDs)
}

// P2P Message Types
export type P2PMessageType = 'JOIN_REQUEST' | 'LOBBY_UPDATE' | 'START_SESSION' | 'VOTE_UPDATE' | 'MATCH_FOUND' | 'SESSION_FINISH';

export interface P2PMessage {
  type: P2PMessageType;
  groupId: string;
  senderId: string;
  payload?: any;
}

export type SortOption = 'price_high' | 'price_low' | 'rating_high' | 'rating_low' | 'wait_high' | 'wait_low' | 'dist_high' | 'dist_low';

export interface FilterState {
  sort: SortOption;
  openNow: boolean;
  area: string;
}
