
import React from 'react';
import { Star, Clock, Heart, MapPin } from 'lucide-react';
import { Restaurant } from '../types';

interface Props {
  data: Restaurant;
  onPress: () => void;
  onSave: (id: string) => void;
  isSaved: boolean;
}

const RestaurantCard: React.FC<Props> = ({ data, onPress, onSave, isSaved }) => {
  // Use direct URI if available (provided by API), otherwise search by Name + Address for precision
  const mapUrl = data.googleMapsUri || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(data.name + " " + data.address)}`;

  return (
    <div 
      onClick={onPress}
      className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 active:scale-95 transition-transform duration-100 relative mb-4"
    >
      {/* Card Layout */}
      <div className="flex h-32">
        {/* Left Content */}
        <div className="flex-1 p-3 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-lg leading-tight text-gray-800 mb-1">{data.name}</h3>
            <div className="flex items-center text-yellow-500 text-sm font-medium">
              <Star size={14} fill="#EAB308" className="mr-1"/>
              {data.rating}
            </div>
          </div>

          <div className="text-xs text-gray-500 space-y-1">
            <div className="flex items-center">
               <span className="font-semibold text-gray-700 mr-1">Avg Cost:</span> ${data.avgCostMin}-{data.avgCostMax}
            </div>
            <div className="flex items-center">
               <Clock size={12} className="mr-1"/> Avg Wait: {data.avgWaitMin}-{data.avgWaitMax} min
            </div>
             <a 
              href={mapUrl}
              onClick={(e) => e.stopPropagation()}
              target="_blank"
              rel="noreferrer"
              className="text-blue-500 underline flex items-center mt-1"
            >
              Open in Map
            </a>
          </div>
        </div>

        {/* Right Content (Image + Dist) */}
        <div className="w-32 h-full relative bg-gray-200">
            <img src={data.images[0]} alt={data.name} className="w-full h-full object-cover" />
            <div className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">
                {data.distanceKm} KM
            </div>
        </div>
      </div>

      {/* Save Button Absolute */}
      <button 
        onClick={(e) => {
            e.stopPropagation();
            onSave(data.id);
        }}
        className="absolute top-2 right-2 p-1.5 bg-white/80 backdrop-blur-sm rounded-full shadow-sm"
      >
        <Heart size={18} fill={isSaved ? "#FF5A5F" : "none"} color={isSaved ? "#FF5A5F" : "#666"} />
      </button>
    </div>
  );
};

export default RestaurantCard;
