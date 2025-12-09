
import React, { useState, useEffect } from 'react';
import { getSavedRestaurants, toggleSavedRestaurant } from '../services/db';
import RestaurantCard from '../components/RestaurantCard';
import RestaurantDetail from '../components/RestaurantDetail';
import { Restaurant } from '../types';

const Saved: React.FC = () => {
  const [savedList, setSavedList] = useState<Restaurant[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);

  useEffect(() => {
    refreshSaved();
  }, []);

  const refreshSaved = () => {
    setSavedList(getSavedRestaurants());
  };

  const handleRemove = (restaurant: Restaurant) => {
    // Toggle will remove it since it is already in the list
    toggleSavedRestaurant(restaurant);
    refreshSaved();
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 pt-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Saved Places</h1>
      
      {savedList.length === 0 ? (
        <div className="text-center text-gray-400 mt-20">
            You haven't saved any restaurants yet.
        </div>
      ) : (
        <div className="space-y-4">
            {savedList.map(restaurant => (
                <RestaurantCard 
                    key={restaurant.id} 
                    data={restaurant} 
                    onPress={() => setSelectedRestaurant(restaurant)}
                    onSave={() => handleRemove(restaurant)}
                    isSaved={true}
                />
            ))}
        </div>
      )}

      {selectedRestaurant && (
        <RestaurantDetail restaurant={selectedRestaurant} onClose={() => setSelectedRestaurant(null)} />
      )}
    </div>
  );
};

export default Saved;
