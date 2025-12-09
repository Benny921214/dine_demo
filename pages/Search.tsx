import React, { useState, useEffect } from 'react';
import { Search as SearchIcon, Loader2, MapPin } from 'lucide-react';
import { getSavedRestaurants, toggleSavedRestaurant } from '../services/db';
import { searchRestaurants } from '../services/gemini';
import { getLocationWithFallback } from '../services/location';
import RestaurantCard from '../components/RestaurantCard';
import RestaurantDetail from '../components/RestaurantDetail';
import { Restaurant } from '../types';

const Search: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [locationHint, setLocationHint] = useState<string>('');

  useEffect(() => {
    const saved = getSavedRestaurants();
    setSavedIds(new Set(saved.map(r => r.id)));

    // Get Location for search context
    void (async () => {
        const { coords, error } = await getLocationWithFallback();
        if (coords) {
            setLocation(coords);
        }
        if (error) {
            setLocationHint(error);
        }
    })();
  }, []);

  // Debounce search
  useEffect(() => {
      const timer = setTimeout(() => {
          if (query.trim().length > 1) {
              performSearch();
          }
      }, 800);
      return () => clearTimeout(timer);
  }, [query]);

  const performSearch = async () => {
      setLoading(true);
      try {
          // Use location if available, otherwise default to "nearby" string which might just search broadly
          const searchContext = location || "nearby";
          const data = await searchRestaurants(searchContext, query);
          setResults(data);
      } catch (e) {
          console.error(e);
      } finally {
          setLoading(false);
      }
  };

  const handleSave = (id: string) => {
    const restaurant = results.find(r => r.id === id);
    if (!restaurant) return;
    
    const isNowSaved = toggleSavedRestaurant(restaurant);
    
    setSavedIds(prev => {
        const newSet = new Set(prev);
        if (isNowSaved) newSet.add(id);
        else newSet.delete(id);
        return newSet;
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 pt-8 px-4">
      <div className="relative mb-6">
        <input 
            type="text" 
            placeholder="Search restaurants, sushi, tacos..."
            className="w-full pl-10 pr-12 py-4 rounded-xl border-none shadow-sm bg-white focus:ring-2 focus:ring-primary outline-none"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
        />
        <SearchIcon className="absolute left-3 top-4 text-gray-400" size={20} />
        {loading && (
             <div className="absolute right-3 top-4 text-primary animate-spin">
                <Loader2 size={20} />
             </div>
        )}
      </div>

      <div className="flex items-center gap-2 mb-4 text-xs text-gray-500 px-2">
         <MapPin size={12} />
         {location ? "Searching near your location" : "Searching globally (Enable GPS for better results)"}
      </div>
      {locationHint && (
        <div className="text-[11px] text-red-500 px-2 pb-2">
            {locationHint}
        </div>
      )}

      <div className="space-y-4">
        {!loading && query && results.length === 0 && (
            <div className="text-center text-gray-500 mt-10">No results found on Google Maps.</div>
        )}
        
        {loading && results.length === 0 && (
             <div className="text-center text-gray-400 mt-10">Searching Google Maps...</div>
        )}

        {results.map(restaurant => (
            <RestaurantCard 
                key={restaurant.id} 
                data={restaurant} 
                onPress={() => setSelectedRestaurant(restaurant)}
                onSave={handleSave}
                isSaved={savedIds.has(restaurant.id)}
            />
        ))}
      </div>

      {selectedRestaurant && (
        <RestaurantDetail restaurant={selectedRestaurant} onClose={() => setSelectedRestaurant(null)} />
      )}
    </div>
  );
};

export default Search;
