import React, { useState, useMemo, useEffect } from 'react';
import { SlidersHorizontal, X, MapPin, Loader2, RotateCcw, Navigation } from 'lucide-react';
import { getSavedRestaurants, toggleSavedRestaurant } from '../services/db';
import { searchRestaurants } from '../services/gemini';
import RestaurantCard from '../components/RestaurantCard';
import RestaurantDetail from '../components/RestaurantDetail';
import { Restaurant, SortOption } from '../types';

const Home: React.FC = () => {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  
  // Location State
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null);
  const [locationError, setLocationError] = useState<string>('');
  
  // Filter States
  const [sort, setSort] = useState<SortOption>('rating_high');
  const [openNow, setOpenNow] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  // Init
  useEffect(() => {
    const saved = getSavedRestaurants();
    setSavedIds(new Set(saved.map(r => r.id)));
    
    // Initial fetch with location
    handleRefreshLocation();
  }, []);

  const handleRefreshLocation = () => {
      setLoading(true);
      setLocationError('');
      
      if (!navigator.geolocation) {
          setLocationError("Geolocation is not supported by your browser");
          fetchData("Downtown"); // Fallback
          return;
      }

      navigator.geolocation.getCurrentPosition(
          (position) => {
              const loc = {
                  lat: position.coords.latitude,
                  lng: position.coords.longitude
              };
              setCurrentLocation(loc);
              fetchData(loc);
          },
          (error) => {
              console.error("Geo Error", error);
              setLocationError("Unable to retrieve your location");
              // Fallback to a default search if GPS fails
              fetchData("Downtown");
          },
          { enableHighAccuracy: true, timeout: 5000 }
      );
  };

  const fetchData = async (locationOrArea: string | {lat: number, lng: number}) => {
    setLoading(true);
    setRestaurants([]); // Clear previous
    try {
        const results = await searchRestaurants(locationOrArea, "popular restaurants");
        setRestaurants(results);
    } catch (e) {
        console.error(e);
    } finally {
        setLoading(false);
    }
  };

  const handleSave = (id: string) => {
    const restaurant = restaurants.find(r => r.id === id);
    if (!restaurant) return;

    const isNowSaved = toggleSavedRestaurant(restaurant);
    
    setSavedIds(prev => {
        const newSet = new Set(prev);
        if (isNowSaved) newSet.add(id);
        else newSet.delete(id);
        return newSet;
    });
  };

  const filteredRestaurants = useMemo(() => {
    let result = [...restaurants];

    if (openNow) {
        result = result.filter(r => r.isOpen);
    }

    switch (sort) {
        case 'price_low': result.sort((a, b) => a.avgCostMin - b.avgCostMin); break;
        case 'price_high': result.sort((a, b) => b.avgCostMin - a.avgCostMin); break;
        case 'rating_high': result.sort((a, b) => b.rating - a.rating); break;
        case 'rating_low': result.sort((a, b) => a.rating - b.rating); break;
        case 'wait_low': result.sort((a, b) => a.avgWaitMin - b.avgWaitMin); break;
        case 'wait_high': result.sort((a, b) => b.avgWaitMin - a.avgWaitMin); break;
        case 'dist_low': result.sort((a, b) => a.distanceKm - b.distanceKm); break;
        case 'dist_high': result.sort((a, b) => b.distanceKm - a.distanceKm); break;
    }

    return result;
  }, [restaurants, sort, openNow]);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white px-6 pt-8 pb-4 sticky top-0 z-10 shadow-sm flex justify-between items-start">
        <div>
            <h1 className="text-2xl font-bold text-gray-800">
                Find Food<br/>
                <span className="text-primary">Near You</span>
            </h1>
            
            {/* Location Indicator */}
            <div className="flex items-center gap-2 mt-2 text-sm text-gray-500 bg-gray-100 p-2 rounded-lg w-fit transition-all">
                <Navigation size={14} className={`text-primary ${loading ? 'animate-pulse' : ''}`} />
                <span className="font-medium text-gray-700">
                    {locationError ? 'Location Unavailable' : loading ? 'Locating...' : 'Current Location'}
                </span>
            </div>
        </div>

        {/* Refresh Button */}
        <button 
            onClick={handleRefreshLocation}
            disabled={loading}
            className="p-3 bg-gray-100 rounded-full text-gray-600 hover:bg-gray-200 active:scale-95 transition-all disabled:opacity-50"
        >
            <RotateCcw size={20} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* List */}
      <div className="p-4 space-y-4">
        {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
                <Loader2 size={40} className="text-primary animate-spin" />
                <p className="text-gray-400 font-medium">Scanning area...</p>
            </div>
        ) : filteredRestaurants.length === 0 ? (
            <div className="text-center text-gray-400 py-10">
                {locationError ? "Please enable GPS to find restaurants." : "No restaurants found nearby."}
                {locationError && <p className="text-xs text-red-400 mt-2">{locationError}</p>}
            </div>
        ) : (
            filteredRestaurants.map(restaurant => (
                <RestaurantCard 
                    key={restaurant.id} 
                    data={restaurant} 
                    onPress={() => setSelectedRestaurant(restaurant)}
                    onSave={handleSave}
                    isSaved={savedIds.has(restaurant.id)}
                />
            ))
        )}
      </div>

      {/* Filter Trigger */}
      <button 
        onClick={() => setIsFilterOpen(true)}
        className="fixed bottom-20 right-6 bg-primary text-white p-4 rounded-full shadow-xl z-40 flex items-center gap-2 hover:bg-red-600 transition-colors"
      >
        <SlidersHorizontal size={20} />
        <span className="font-bold">Sorting</span>
      </button>

      {/* Filter Modal */}
      {isFilterOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center animate-in fade-in duration-200">
            <div className="bg-white w-full rounded-t-3xl p-6 pb-28 space-y-6 animate-in slide-in-from-bottom-10 duration-300 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold">Filter & Sort</h2>
                    <button onClick={() => setIsFilterOpen(false)} className="p-2 bg-gray-100 rounded-full"><X size={20}/></button>
                </div>

                {/* Sort Section */}
                <div className="space-y-3">
                    <label className="font-semibold text-gray-700">Sort By</label>
                    <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => setSort('rating_high')} className={`p-2 text-sm rounded-lg border ${sort === 'rating_high' ? 'bg-primary/10 border-primary text-primary' : 'border-gray-200'}`}>Rating: High to Low</button>
                        <button onClick={() => setSort('price_low')} className={`p-2 text-sm rounded-lg border ${sort === 'price_low' ? 'bg-primary/10 border-primary text-primary' : 'border-gray-200'}`}>Price: Low to High</button>
                        <button onClick={() => setSort('dist_low')} className={`p-2 text-sm rounded-lg border ${sort === 'dist_low' ? 'bg-primary/10 border-primary text-primary' : 'border-gray-200'}`}>Distance: Low to High</button>
                    </div>
                </div>

                {/* Open Now */}
                <div className="flex items-center justify-between p-3 border rounded-xl">
                    <span className="font-semibold text-gray-700">Open Now Only</span>
                    <button 
                        onClick={() => setOpenNow(!openNow)}
                        className={`w-12 h-6 rounded-full transition-colors relative ${openNow ? 'bg-primary' : 'bg-gray-300'}`}
                    >
                        <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${openNow ? 'left-6' : 'left-0.5'}`} />
                    </button>
                </div>

                <div className="sticky bottom-0 left-0 right-0 bg-white pt-4">
                    <button 
                        onClick={() => setIsFilterOpen(false)}
                        className="w-full bg-primary text-white font-bold py-3 rounded-xl shadow-lg"
                    >
                        Apply Filters
                    </button>
                </div>
            </div>
        </div>
      )}

      {selectedRestaurant && (
        <RestaurantDetail restaurant={selectedRestaurant} onClose={() => setSelectedRestaurant(null)} />
      )}
    </div>
  );
};

export default Home;
