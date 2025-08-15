// app/DayEditor.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { DiscoveryActivity, DayPlan, UserPreferences } from './types';
import dynamic from 'next/dynamic';
const Map = dynamic(() => import('./Map'), { ssr: false });

interface DayEditorProps {
  dayNumber: number;
  theme: string;
  summary: string;
  activities: DiscoveryActivity[];
  destination: string;
  preferences: UserPreferences;
  dayPlan: DayPlan;
  onChange: (plan: DayPlan) => void;
  onMakeChanges: (plan: DayPlan) => void;
  onFinishDay: (plan: DayPlan) => void;
}

export default function DayEditor({ 
  dayNumber, 
  theme, 
  summary, 
  activities, 
  destination, 
  preferences, 
  dayPlan, 
  onChange, 
  onMakeChanges, 
  onFinishDay 
}: DayEditorProps) {
  const [order, setOrder] = useState<string[]>(dayPlan.items.map(item => item.id));
  const [durationOverrides, setDurationOverrides] = useState<Record<string, number>>({});
  
  const orderedItems = useMemo(() => 
    order.map(id => dayPlan.items.find(item => item.id === id)!).filter(Boolean), 
    [order, dayPlan.items]
  );

  const markers = useMemo(() => orderedItems.map(item => ({
    lat: item.location.latitude,
    lng: item.location.longitude,
    popup: item.name,
  })), [orderedItems]);

  const handleMove = (idx: number, direction: -1 | 1) => {
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= order.length) return;
    const updated = [...order];
    const [moved] = updated.splice(idx, 1);
    updated.splice(newIdx, 0, moved);
    setOrder(updated);
  };

  const handleDurationChange = (itemId: string, minutes: number) => {
    setDurationOverrides(prev => ({ ...prev, [itemId]: minutes }));
  };

  const centroid = useMemo(() => {
    if (orderedItems.length === 0) return [0, 0] as [number, number];
    const avgLat = orderedItems.reduce((s, item) => s + item.location.latitude, 0) / orderedItems.length;
    const avgLng = orderedItems.reduce((s, item) => s + item.location.longitude, 0) / orderedItems.length;
    return [avgLat, avgLng] as [number, number];
  }, [orderedItems]);

  // Report plan upward as user edits
  useEffect(() => {
    // Only call onChange if the user has actually made changes
    if (order.length > 0 && order.some((id, idx) => dayPlan.items[idx]?.id !== id)) {
      const updatedPlan: DayPlan = {
        ...dayPlan,
        items: orderedItems,
      };
      onChange(updatedPlan);
    }
  }, [order, dayPlan, onChange, orderedItems]);

  // Helper function to safely get recommendations
  const getRecommendations = (type: 'stayHere' | 'dayTrip' | 'newTown') => {
    if (!dayPlan.daySummary?.recommendations?.[type]) return [];
    const rec = dayPlan.daySummary.recommendations[type];
    return Array.isArray(rec) ? rec : [rec].filter(Boolean);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 rounded-xl bg-white dark:bg-zinc-900 shadow">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-bold text-blue-600">DAY {dayNumber}</div>
            <div className="text-2xl font-bold">{theme}</div>
            <div className="text-gray-600 dark:text-gray-300">{summary}</div>
            {dayPlan.hostel && (
              <div className="mt-2 text-sm text-gray-500">
                🏠 {dayPlan.hostel.name} • {dayPlan.hostel.costPerNight}/night
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => onMakeChanges(dayPlan)}
              className="px-4 py-2 rounded-full bg-blue-600 text-white font-semibold hover:bg-blue-700"
            >
              Make Changes
            </button>
            <button
              onClick={() => onFinishDay(dayPlan)}
              className="px-4 py-2 rounded-full bg-green-600 text-white font-semibold hover:bg-green-700"
            >
              Finish Day
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Controls and Itinerary */}
        <div className="space-y-4">
          {/* Day Controls */}
          <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 shadow">
            <div className="text-sm font-semibold mb-3">Day Controls</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">Start Time</label>
                <input
                  type="time"
                  defaultValue={preferences.dayStartTime}
                  onChange={(e) => onChange({ ...dayPlan })}
                  className="w-full mt-1 px-3 py-2 rounded border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">Length (hrs)</label>
                <input
                  type="number"
                  min={4}
                  max={16}
                  defaultValue={preferences.dayLengthHours}
                  onChange={() => onChange({ ...dayPlan })}
                  className="w-full mt-1 px-3 py-2 rounded border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">Pace</label>
                <select defaultValue={preferences.defaultPace} onChange={() => onChange({ ...dayPlan })} className="w-full mt-1 px-3 py-2 rounded border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white">
                  <option value="leisurely">Leisurely</option>
                  <option value="moderate">Moderate</option>
                  <option value="fast">Fast</option>
                </select>
              </div>
            </div>
            
            {/* Start Location */}
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-zinc-700">
              <label className="text-xs text-gray-500 dark:text-gray-400">Starting Location</label>
              <div className="mt-2 space-y-2">
                {dayNumber === 1 ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      id="airport-start"
                      name="start-location"
                      defaultChecked
                      className="text-blue-600"
                    />
                    <label htmlFor="airport-start" className="text-sm text-gray-700 dark:text-gray-300">Airport/Arrival Point</label>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      id="hotel-start"
                      name="start-location"
                      defaultChecked
                      className="text-blue-600"
                    />
                    <label htmlFor="hotel-start" className="text-sm text-gray-700 dark:text-gray-300">Previous Day's Hotel</label>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    id="custom-start"
                    name="start-location"
                    className="text-blue-600"
                  />
                  <label htmlFor="custom-start" className="text-sm text-gray-700 dark:text-gray-300">Custom Location</label>
                </div>
                <input
                  type="text"
                  placeholder={dayNumber === 1 ? "e.g., FCO Airport, Rome" : "e.g., Hotel Name, Address"}
                  className="w-full px-3 py-2 rounded border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                />
              </div>
            </div>
          </div>

          {/* Detailed Itinerary */}
          <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 shadow">
            <div className="text-sm font-semibold mb-3">Your Day Itinerary</div>
            <div className="space-y-3">
              {orderedItems.map((item, idx) => (
                <div key={item.id} className="rounded-lg border border-gray-200 dark:border-zinc-800 p-3">
                  <div className="flex items-start gap-3">
                    <div className="w-16 text-sm font-mono text-gray-700 dark:text-gray-300 mt-1">
                      {item.startTime}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">{item.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          item.type === 'attraction' ? 'bg-blue-100 text-blue-800' :
                          item.type === 'food' ? 'bg-green-100 text-green-800' :
                          item.type === 'break' ? 'bg-yellow-100 text-yellow-800' :
                          item.type === 'hostel' ? 'bg-purple-100 text-purple-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {item.type}
                        </span>
                        {item.rating === 3 && (
                          <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">Must-Do</span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">{item.description}</div>
                      
                      {/* Operating Hours & Cost */}
                      {(item.operatingHours || item.cost) && (
                        <div className="flex gap-4 text-xs text-gray-500 mb-2">
                          {item.operatingHours && (
                            <span>🕐 {item.operatingHours}</span>
                          )}
                          {item.cost && (
                            <span>💰 {item.cost}</span>
                          )}
                        </div>
                      )}
                      
                      {/* Notes */}
                      {item.notes && (
                        <div className="text-xs text-gray-500 bg-gray-50 dark:bg-zinc-800 p-2 rounded mb-2">
                          💡 {item.notes}
                        </div>
                      )}
                      
                      {/* Nearby Sites */}
                      {item.nearbySites && item.nearbySites.length > 0 && (
                        <div className="text-xs text-gray-500">
                          <div className="font-medium mb-1">📍 Nearby (not visited today):</div>
                          {item.nearbySites.map((site, siteIdx) => (
                            <div key={siteIdx} className="ml-2">
                              • {site.name} ({site.distance}): {site.description}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleMove(idx, -1)} className="px-2 py-1 rounded border text-sm">↑</button>
                      <button onClick={() => handleMove(idx, 1)} className="px-2 py-1 rounded border text-sm">↓</button>
                    </div>
                    <div className="w-20">
                      <input
                        type="number"
                        min={15}
                        step={5}
                        value={durationOverrides[item.id] ?? item.durationMinutes}
                        onChange={(e) => handleDurationChange(item.id, Number(e.target.value))}
                        className="w-full px-2 py-1 rounded border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white text-sm"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Day Summary */}
          {dayPlan.daySummary && (
            <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 shadow">
              <div className="text-sm font-semibold mb-3">Day Summary</div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-gray-500">Travel Time:</div>
                  <div className="font-medium">{dayPlan.daySummary.totalTravelTime}</div>
                </div>
                <div>
                  <div className="text-gray-500">Activity Time:</div>
                  <div className="font-medium">{dayPlan.daySummary.totalActivityTime}</div>
                </div>
                <div>
                  <div className="text-gray-500">Total Cost:</div>
                  <div className="font-medium">{dayPlan.daySummary.totalCost}</div>
                </div>
                <div>
                  <div className="text-gray-500">Distance:</div>
                  <div className="font-medium">{dayPlan.daySummary.distanceCovered}</div>
                </div>
              </div>
              
              {/* Recommendations */}
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-zinc-700">
                <div className="text-sm font-medium mb-2">Recommendations for Next Day:</div>
                <div className="grid grid-cols-1 gap-2 text-xs">
                  <div>
                    <span className="text-gray-500">Stay Here:</span> {getRecommendations('stayHere').join(', ') || 'No specific recommendations'}
                  </div>
                  <div>
                    <span className="text-gray-500">Day Trip:</span> {getRecommendations('dayTrip').join(', ') || 'No specific recommendations'}
                  </div>
                  <div>
                    <span className="text-gray-500">New Town:</span> {getRecommendations('newTown').join(', ') || 'No specific recommendations'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Verification */}
          {dayPlan.verification && (
            <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 shadow">
              <div className="text-sm font-semibold mb-3">Verification & Efficiency</div>
              <div className="space-y-2 text-xs text-gray-600 dark:text-gray-300">
                <div><span className="font-medium">Operating Hours:</span> {dayPlan.verification.operatingHoursCheck}</div>
                <div><span className="font-medium">Efficiency:</span> {dayPlan.verification.efficiencyNotes}</div>
                <div><span className="font-medium">Adjustments:</span> {dayPlan.verification.adjustmentsMade}</div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Map */}
        <div className="h-[600px] rounded-xl overflow-hidden shadow">
          <Map center={centroid} zoom={13} markers={markers} />
        </div>
      </div>
    </div>
  );
}


