
import React, { useState } from 'react';
import { X, MapPin, Clock, DollarSign, Phone, Users, Utensils, CheckCircle, Image as ImageIcon } from 'lucide-react';
import { Restaurant } from '../types';

interface Props {
  restaurant: Restaurant;
  onClose: () => void;
  zIndexOverride?: number;
}

const RestaurantDetail: React.FC<Props> = ({ restaurant, onClose, zIndexOverride }) => {
  const [showAllPhotos, setShowAllPhotos] = useState(false);

  // Use direct URI if available, otherwise search by Name + Address for precision
  const mapUrl = restaurant.googleMapsUri || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(restaurant.name + " " + restaurant.address)}`;

  if (showAllPhotos) {
    return (
      <div className="fixed inset-0 bg-black z-[60] overflow-y-auto p-4 flex flex-col">
        <button onClick={() => setShowAllPhotos(false)} className="absolute top-4 right-4 text-white bg-gray-800 rounded-full p-2">
            <X size={24} />
        </button>
        <div className="grid grid-cols-1 gap-4 mt-12">
            {restaurant.images.map((img, idx) => (
                <img key={idx} src={img} alt={`Gallery ${idx}`} className="w-full rounded-lg" />
            ))}
        </div>
      </div>
    )
  }

  const zIndexClass = zIndexOverride ? `z-[${zIndexOverride}]` : 'z-50';

  return (
    <div className={`fixed inset-0 bg-white ${zIndexClass} overflow-y-auto flex flex-col animate-in slide-in-from-bottom-10 duration-300`}>
        {/* Header Image */}
      <div className="relative h-64 w-full shrink-0 group cursor-pointer" onClick={() => setShowAllPhotos(true)}>
        <img src={restaurant.images[0]} alt={restaurant.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors flex items-center justify-center">
            <button className="bg-black/50 text-white px-4 py-2 rounded-full flex items-center gap-2 text-sm backdrop-blur-md">
                <ImageIcon size={16} /> View all photos
            </button>
        </div>
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 bg-black/60 text-white rounded-full p-2"
          aria-label="Close"
        >
          <X size={20} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 pb-24 space-y-6">
        
        <div>
            <h1 className="text-2xl font-bold text-gray-900">{restaurant.name}</h1>
            <div className="flex flex-wrap gap-2 mt-2">
                <div className="flex items-center text-gray-600 bg-gray-100 px-3 py-1 rounded-full text-sm">
                    <DollarSign size={14} className="mr-1" />
                    Average Cost: {restaurant.avgCostMin}-{restaurant.avgCostMax}
                </div>
                <div className="flex items-center text-gray-600 bg-gray-100 px-3 py-1 rounded-full text-sm">
                    <Clock size={14} className="mr-1" />
                    Wait: {restaurant.avgWaitMin}-{restaurant.avgWaitMax} min
                </div>
            </div>
        </div>

        <div className="space-y-4 text-sm text-gray-700">
            <div className="flex items-start">
                <MapPin size={18} className="mr-3 mt-0.5 text-primary shrink-0" />
                <div>
                    <div className="font-semibold">Address</div>
                    <div className="text-gray-500 break-words">{restaurant.address}</div>
                </div>
            </div>

            <div className="flex items-start">
                <Clock size={18} className="mr-3 mt-0.5 text-primary shrink-0" />
                <div>
                    <div className="font-semibold">Mealtime Limit</div>
                    <div className="text-gray-500">{restaurant.mealTimeHours} hours</div>
                </div>
            </div>

            <div className="flex items-start">
                <Clock size={18} className="mr-3 mt-0.5 text-primary shrink-0" />
                <div>
                    <div className="font-semibold">Business Hours</div>
                    <div className="text-gray-500">{restaurant.hours}</div>
                </div>
            </div>

            <div className="flex items-start">
                <CheckCircle size={18} className="mr-3 mt-0.5 text-primary shrink-0" />
                <div>
                    <div className="font-semibold">Service</div>
                    <div className="text-gray-500">{restaurant.services.join('、')}</div>
                </div>
            </div>

             <div className="flex items-start">
                <Utensils size={18} className="mr-3 mt-0.5 text-primary shrink-0" />
                <div>
                    <div className="font-semibold">Food</div>
                    <div className="text-gray-500">{restaurant.foodTypes.join('、')}</div>
                </div>
            </div>

            <div className="flex items-start">
                <Users size={18} className="mr-3 mt-0.5 text-primary shrink-0" />
                <div>
                    <div className="font-semibold">Seats</div>
                    <div className="text-gray-500">{restaurant.seats}</div>
                </div>
            </div>

            <div className="flex items-start">
                <Phone size={18} className="mr-3 mt-0.5 text-primary shrink-0" />
                <div>
                    <div className="font-semibold">Phone</div>
                    <div className="text-blue-600 underline" onClick={() => window.location.href=`tel:${restaurant.phone}`}>{restaurant.phone}</div>
                </div>
            </div>
        </div>

        <div className="flex gap-4 pt-4">
            <a 
                href={mapUrl}
                target="_blank"
                rel="noreferrer"
                className="flex-1 bg-blue-50 text-blue-600 py-3 rounded-xl text-center font-medium border border-blue-200"
            >
                Open in Google Map
            </a>
             <button className="flex-1 bg-orange-50 text-orange-600 py-3 rounded-xl text-center font-medium border border-orange-200">
                See Menu
            </button>
        </div>

      </div>

      {/* Close Button Footer */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100">
        <button 
            onClick={onClose}
            className="w-full bg-gray-900 text-white py-4 rounded-xl font-bold shadow-lg active:scale-[0.98] transition-transform"
        >
            Close
        </button>
      </div>
    </div>
  );
};

export default RestaurantDetail;
