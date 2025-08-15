// app/ActivityCard.tsx
'use client';

import { DiscoveryActivity } from './types';
import { useLongPress } from 'use-long-press';
import { useCallback } from 'react';

interface ActivityCardProps {
  activity: DiscoveryActivity;
  isSelected: boolean;
  isAvoided: boolean;
  onSelect: (id: string) => void;
  onAvoid: (id: string) => void;
}

export default function ActivityCard({ activity, isSelected, isAvoided, onSelect, onAvoid }: ActivityCardProps) {
  
  const handleAvoid = useCallback(() => {
    onAvoid(activity.id);
  }, [activity.id, onAvoid]);

  const longPressBindings = useLongPress(handleAvoid, {
    threshold: 500,
    captureEvent: true,
    cancelOnMovement: false,
    onCancel: () => onSelect(activity.id),
  });

  const hasValidImage = activity.imageUrl && activity.imageUrl.startsWith('http');

  return (
    <div
      {...longPressBindings()}
      className={`w-full break-inside-avoid rounded-xl shadow-lg overflow-hidden transition-all duration-300 mb-4
        ${isAvoided ? 'opacity-40 grayscale' : 'cursor-pointer hover:shadow-xl'}
        ${isSelected ? 'ring-4 ring-blue-500 ring-offset-2' : ''}`}
    >
      <div className={`${isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-white dark:bg-zinc-900'}`}>
        <div className="relative">
          {hasValidImage ? (
            <img 
              src={activity.imageUrl} 
              alt={activity.name} 
              className="w-full h-48 object-cover" 
              loading="lazy"
            />
          ) : (
            <div className="w-full h-48 bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
              <div className="text-white text-center">
                <div className="text-2xl mb-2">🏛️</div>
                <div className="text-sm font-medium">{activity.name}</div>
              </div>
            </div>
          )}
          
          <div className="absolute top-3 right-3">
            {activity.rating === 3 && (
              <div className="bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">MUST-DO</div>
            )}
            {activity.rating === 2 && (
              <div className="bg-gray-200/90 text-gray-800 text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg">RECOMMENDED</div>
            )}
            {activity.rating === 1 && (
              <div className="bg-blue-100 text-blue-800 text-xs font-medium px-3 py-1.5 rounded-full shadow-lg">INTERESTING</div>
            )}
          </div>
        </div>
        
        <div className="p-4 space-y-3">
          <h3 className="font-bold text-lg text-gray-900 dark:text-white leading-tight">{activity.name}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{activity.description}</p>
          
          <div className="flex items-center justify-between pt-2">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {activity.rating === 3 && 'Iconic landmark'}
              {activity.rating === 2 && 'Highly rated'}
              {activity.rating === 1 && 'Local favorite'}
            </div>
            {isSelected && (
              <div className="text-blue-600 dark:text-blue-400 text-sm font-medium">✓ Selected</div>
            )}
            {isAvoided && (
              <div className="text-red-600 dark:text-red-400 text-sm font-medium">✗ Avoided</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}