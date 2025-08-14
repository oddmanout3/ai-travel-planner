'use client';

import { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';

// --- TypeScript Interfaces ---
interface Location {
  name: string;
  latitude: number;
  longitude: number;
}
interface Activity {
  time: string;
  description: string;
  detailed_description: string;
  opening_hours: string;
  location: Location;
  cost?: string | number;
  booking_required?: boolean;
}
interface Day {
  day: number;
  title?: string;
  activities: Activity[];
}
interface ApiResponse {
  itinerary: Day[];
}

export default function Home() {
  const [prompt, setPrompt] = useState('1 day in Las Vegas');
  const [itinerary, setItinerary] = useState<ApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([36.1716, -115.1391]);
  const [mapZoom, setMapZoom] = useState(12);

  // --- UI Controls State ---
  const [dayLength, setDayLength] = useState('12');
  const [pacing, setPacing] = useState('moderate');
  const [likes, setLikes] = useState('');
  const [dislikes, setDislikes] = useState('');
  const [travelPreference, setTravelPreference] = useState('balanced');

  const Map = useMemo(() => dynamic(() => import('./Map'), { 
    loading: () => <p>A map is loading...</p>,
    ssr: false 
  }), []);

  const handleActivityClick = (activity: Activity) => {
    setSelectedActivity(selectedActivity === activity ? null : activity);
    setMapCenter([activity.location.latitude, activity.location.longitude]);
    setMapZoom(15);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setItinerary(null);
    setSelectedActivity(null);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, dayLength, pacing, likes, dislikes, travelPreference }),
      });

      if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
      const data: ApiResponse = await response.json();
      setItinerary(data);

      const firstValidActivity = data.itinerary?.[0]?.activities.find(act => act.location);
      if (firstValidActivity) {
        setMapCenter([firstValidActivity.location.latitude, firstValidActivity.location.longitude]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate itinerary.');
    } finally {
      setIsLoading(false);
    }
  };

  const markers = useMemo(() => {
    if (!itinerary) return [];
    return itinerary.itinerary.flatMap(day => 
      day.activities
        .filter(activity => activity.location)
        .map(activity => ({
          lat: activity.location.latitude,
          lng: activity.location.longitude,
          popup: activity.location.name,
        }))
    );
  }, [itinerary]);

  return (
    <main className="flex min-h-screen flex-col items-center p-4 md:p-12 bg-gray-50 font-sans">
      <div className="w-full max-w-7xl">
        <h1 className="text-4xl font-bold mb-6 text-center text-gray-800">AI Travel Planner 🌍</h1>
        
        {/* THIS IS THE RESTORED FORM */}
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md mb-8 max-w-4xl mx-auto">
          <label htmlFor="prompt" className="block text-sm font-medium text-gray-700">Destination & Duration</label>
          <textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g., 3 days in Rome, Italy"
            className="mt-1 w-full p-3 border border-gray-300 rounded-md shadow-sm text-xl text-black"
            rows={2}
            disabled={isLoading}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label htmlFor="likes" className="block text-sm font-medium text-gray-700">Likes (e.g., art museums, hiking)</label>
              <textarea 
                id="likes"
                value={likes} 
                onChange={(e) => setLikes(e.target.value)} 
                className="mt-1 w-full p-2 border border-gray-300 rounded-md shadow-sm"
                rows={2}
              />
            </div>
            <div>
              <label htmlFor="dislikes" className="block text-sm font-medium text-gray-700">Dislikes (e.g., crowded places, shopping)</label>
              <textarea 
                id="dislikes"
                value={dislikes} 
                onChange={(e) => setDislikes(e.target.value)} 
                className="mt-1 w-full p-2 border border-gray-300 rounded-md shadow-sm"
                rows={2}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div>
              <label htmlFor="dayLength" className="block text-sm font-medium text-gray-700">Day Length</label>
              <select id="dayLength" value={dayLength} onChange={(e) => setDayLength(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm">
                <option value="8">8 Hours</option>
                <option value="10">10 Hours</option>
                <option value="12">12 Hours</option>
                <option value="14">14+ Hours</option>
              </select>
            </div>
             <div>
              <label htmlFor="pacing" className="block text-sm font-medium text-gray-700">Pacing</label>
              <select id="pacing" value={pacing} onChange={(e) => setPacing(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm">
                <option value="crammed">Crammed</option>
                <option value="moderate">Moderate</option>
                <option value="relaxed">Relaxed</option>
              </select>
            </div>
            <div>
              <label htmlFor="travelPreference" className="block text-sm font-medium text-gray-700">Travel Style</label>
              <select id="travelPreference" value={travelPreference} onChange={(e) => setTravelPreference(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm">
                <option value="balanced">Balanced (Walk/Transit)</option>
                <option value="walking">Walk-Focused</option>
                <option value="fastest">Fastest (Taxis)</option>
              </select>
            </div>
          </div>
          <button
            type="submit"
            disabled={isLoading || !prompt}
            className="mt-6 w-full bg-blue-600 text-white p-3 rounded-md font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Generating...' : 'Generate Itinerary'}
          </button>
        </form>

        {error && <p className="text-red-600 mt-4 text-center">{error}</p>}
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white p-6 rounded-lg shadow-md h-[75vh] overflow-y-auto">
            <h2 className="text-3xl font-bold mb-4 text-gray-800 sticky top-0 bg-white pb-4 -mt-6 pt-6">Your Itinerary</h2>
            {isLoading && <p>Loading...</p>}
            {itinerary && itinerary.itinerary.map((day) => (
              <div key={day.day}>
                <h3 className="text-2xl font-semibold my-3 text-blue-700 border-b-2 pb-2">Day {day.day}: {day.title}</h3>
                <ul className="space-y-2">
                  {day.activities && day.activities
                    .filter(activity => activity.location)
                    .map((activity, index) => (
                    <li key={index} className="bg-gray-100 rounded-lg">
                      <div 
                        onClick={() => handleActivityClick(activity)}
                        className="p-3 cursor-pointer"
                      >
                        <p className="font-bold text-gray-800">{activity.time} - {activity.location.name}</p>
                        <p className="text-sm text-gray-600">{activity.description}</p>
                      </div>
                      
                      {selectedActivity === activity && (
                        <div className="p-3 border-t border-gray-200 animate-fade-in space-y-2">
                          <p className="text-sm">{activity.detailed_description}</p>
                          <div>
                            <p><strong>Hours:</strong> {activity.opening_hours}</p>
                            <p><strong>Cost:</strong> {activity.cost}</p>
                            {activity.booking_required && <p className="font-bold text-red-500">Booking Required!</p>}
                          </div>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="h-[75vh] w-full rounded-lg shadow-md lg:sticky lg-top-8">
            <Map center={mapCenter} zoom={mapZoom} markers={markers} />
          </div>
        </div>
      </div>
    </main>
  );
}