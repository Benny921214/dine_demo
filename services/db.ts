
import { Restaurant, Group, SelectionResult, UserProfile } from '../types';
import { MOCK_RESTAURANTS, AREAS as MOCK_AREAS, MOCK_GROUPS } from '../mockData';

const DB_KEY = 'dine_decide_db_v1';
const AREAS_KEY = 'dine_decide_areas_v1';
const SAVED_DB_KEY = 'dine_decide_saved_db_v1';
const GROUPS_KEY = 'dine_decide_groups_v1';
const RESULTS_KEY = 'dine_decide_results_v1';
const USER_KEY = 'dine_decide_user_v1';

// Initialize DB with Mock Data if empty
const initDB = () => {
  const existing = localStorage.getItem(DB_KEY);
  if (!existing) {
    localStorage.setItem(DB_KEY, JSON.stringify(MOCK_RESTAURANTS));
  }
};

// --- User Identity Operations ---
export const getUserProfile = (): UserProfile => {
  const existing = localStorage.getItem(USER_KEY);
  if (existing) {
    return JSON.parse(existing);
  }
  // Create new identity
  const newProfile: UserProfile = {
    id: 'user_' + Math.random().toString(36).substr(2, 9),
    name: 'User ' + Math.floor(Math.random() * 1000)
  };
  localStorage.setItem(USER_KEY, JSON.stringify(newProfile));
  return newProfile;
};

export const updateUserProfile = (name: string): UserProfile => {
  const profile = getUserProfile();
  profile.name = name;
  localStorage.setItem(USER_KEY, JSON.stringify(profile));
  return profile;
};

// Get all Areas (Databases)
export const getAreas = (): string[] => {
  const existing = localStorage.getItem(AREAS_KEY);
  if (!existing) {
    localStorage.setItem(AREAS_KEY, JSON.stringify(MOCK_AREAS));
    return MOCK_AREAS;
  }
  // Merge defaults to ensure the four base areas always exist, but allow custom ones too.
  const parsed: string[] = JSON.parse(existing);
  const merged = Array.from(new Set([...parsed, ...MOCK_AREAS]));
  localStorage.setItem(AREAS_KEY, JSON.stringify(merged));
  return merged;
};

// Add a new Area
export const addArea = (name: string): void => {
  if (!name || !name.trim()) return;
  const cleanName = name.trim();
  const areas = getAreas();
  if (!areas.includes(cleanName)) {
    areas.push(cleanName);
    localStorage.setItem(AREAS_KEY, JSON.stringify(areas));
  }
};

// Delete an Area and its associated restaurants
export const deleteArea = (name: string): void => {
  // 1. Remove Area from Area List
  const areas = getAreas();
  const filteredAreas = areas.filter(a => a !== name);
  localStorage.setItem(AREAS_KEY, JSON.stringify(filteredAreas));

  // 2. Remove all Restaurants in this Area from Main DB
  const allRestaurants = getAllRestaurants();
  const filteredRestaurants = allRestaurants.filter(r => r.area !== name);
  localStorage.setItem(DB_KEY, JSON.stringify(filteredRestaurants));
  
  // 3. Remove all Restaurants in this Area from Saved DB
  const saved = getSavedRestaurants();
  const filteredSaved = saved.filter(r => r.area !== name);
  localStorage.setItem(SAVED_DB_KEY, JSON.stringify(filteredSaved));
};

// Get all data
export const getAllRestaurants = (): Restaurant[] => {
  initDB();
  const data = localStorage.getItem(DB_KEY);
  return data ? JSON.parse(data) : [];
};

// Get by Area (Simulating "Each area has its own database")
export const getRestaurantsByArea = (area: string): Restaurant[] => {
  const all = getAllRestaurants();
  return all.filter(r => r.area === area);
};

// Create or Update
export const saveRestaurant = (restaurant: Restaurant): void => {
  const all = getAllRestaurants();
  const index = all.findIndex(r => r.id === restaurant.id);
  
  if (index >= 0) {
    all[index] = restaurant;
  } else {
    all.push(restaurant);
  }
  
  localStorage.setItem(DB_KEY, JSON.stringify(all));
};

// Delete Restaurant from Main DB and Saved DB
export const deleteRestaurant = (id: string): void => {
  // Remove from Main DB
  const all = getAllRestaurants();
  const filtered = all.filter(r => r.id !== id);
  localStorage.setItem(DB_KEY, JSON.stringify(filtered));

  // Remove from Saved DB (maintain referential integrity)
  const saved = getSavedRestaurants();
  const filteredSaved = saved.filter(r => r.id !== id);
  localStorage.setItem(SAVED_DB_KEY, JSON.stringify(filteredSaved));
};

// --- Saved Database Operations ---

export const getSavedRestaurants = (): Restaurant[] => {
  const data = localStorage.getItem(SAVED_DB_KEY);
  return data ? JSON.parse(data) : [];
};

export const isRestaurantSaved = (id: string): boolean => {
  const saved = getSavedRestaurants();
  return saved.some(r => r.id === id);
};

export const toggleSavedRestaurant = (restaurant: Restaurant): boolean => {
  const saved = getSavedRestaurants();
  const index = saved.findIndex(r => r.id === restaurant.id);
  let isNowSaved = false;

  if (index >= 0) {
    // Remove if exists
    saved.splice(index, 1);
    isNowSaved = false;
  } else {
    // Add if not exists (prevent duplicates)
    saved.push(restaurant);
    isNowSaved = true;
  }

  localStorage.setItem(SAVED_DB_KEY, JSON.stringify(saved));
  return isNowSaved;
};

// --- Group Database Operations ---

export const getGroups = (): Group[] => {
  const existing = localStorage.getItem(GROUPS_KEY);
  if (!existing) {
    localStorage.setItem(GROUPS_KEY, JSON.stringify(MOCK_GROUPS));
    return MOCK_GROUPS;
  }
  return JSON.parse(existing);
};

export const getGroupById = (id: string): Group | undefined => {
  return getGroups().find(g => g.id === id);
}

export const saveGroup = (group: Group): void => {
  const groups = getGroups();
  const index = groups.findIndex(g => g.id === group.id);
  
  if (index >= 0) {
    groups[index] = group;
  } else {
    groups.push(group);
  }
  
  localStorage.setItem(GROUPS_KEY, JSON.stringify(groups));
};

export const deleteGroup = (id: string): void => {
  const groups = getGroups();
  const filtered = groups.filter(g => g.id !== id);
  localStorage.setItem(GROUPS_KEY, JSON.stringify(filtered));
};

// --- Selection Result Database Operations ---

export const getSelectionResults = (groupId?: string): SelectionResult[] => {
  const data = localStorage.getItem(RESULTS_KEY);
  const allResults: SelectionResult[] = data ? JSON.parse(data) : [];
  
  if (groupId) {
    return allResults.filter(r => r.groupId === groupId).sort((a, b) => b.timestamp - a.timestamp);
  }
  return allResults.sort((a, b) => b.timestamp - a.timestamp);
};

export const saveSelectionResult = (result: SelectionResult): void => {
  const results = getSelectionResults();
  results.push(result);
  localStorage.setItem(RESULTS_KEY, JSON.stringify(results));
};

// --- Backup & Restore Operations ---

export const getDatabaseDump = (): string => {
  const dump = {
    restaurants: JSON.parse(localStorage.getItem(DB_KEY) || '[]'),
    areas: JSON.parse(localStorage.getItem(AREAS_KEY) || '[]'),
    groups: JSON.parse(localStorage.getItem(GROUPS_KEY) || '[]'),
    saved: JSON.parse(localStorage.getItem(SAVED_DB_KEY) || '[]'),
    results: JSON.parse(localStorage.getItem(RESULTS_KEY) || '[]'),
  };
  return JSON.stringify(dump, null, 2);
};

export const restoreDatabase = (jsonString: string): boolean => {
  try {
    const data = JSON.parse(jsonString);
    if (!data) return false;

    // Restore keys if they exist in the dump
    if (data.restaurants) localStorage.setItem(DB_KEY, JSON.stringify(data.restaurants));
    if (data.areas) localStorage.setItem(AREAS_KEY, JSON.stringify(data.areas));
    if (data.groups) localStorage.setItem(GROUPS_KEY, JSON.stringify(data.groups));
    if (data.saved) localStorage.setItem(SAVED_DB_KEY, JSON.stringify(data.saved));
    if (data.results) localStorage.setItem(RESULTS_KEY, JSON.stringify(data.results));
    
    return true;
  } catch (e) {
    console.error("Failed to restore database:", e);
    return false;
  }
};
