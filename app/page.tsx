'use client';

import { useState } from 'react';

// Final TypeScript types
interface Activity {
  time: string;
  description: string;
  notes?: string;
  activity?: string;
  booking_required?: boolean;
}

interface Day {
  day: number;
  activities: Activity[];
  title?: string;
  theme?: string;
}

interface ApiResponse {
  itinerary: Day[];
}

export default function Home() {
  const [prompt, setPrompt] = useState('');
  const [itinerary, setItinerary] = useState<ApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setItinerary(null);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
      }
      
      const data: ApiResponse = await response.json();
      setItinerary(data);

    } catch (err: any) {
      setError(err.message || 'Failed to generate itinerary. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-4 md:p-12 bg-gray-50 font-sans">
      <div className="w-full max-w-2xl">
        <h1 className="text-4xl font-bold mb-6 text-center text-gray-800">AI Travel Planner 🌍</h1>
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g., 1 day in St. Louis, focus on iconic landmarks."
            className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 transition-shadow text-lg text-gray-800"
            rows={4}
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !prompt}
            className="mt-4 w-full bg-blue-600 text-white p-3 rounded-md font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Generating...' : 'Generate Itinerary'}
          </button>
        </form>

        {error && <p className="text-red-600 mt-4 text-center">{error}</p>}

        {itinerary && itinerary.itinerary && (
          <div className="mt-8 bg-white p-6 rounded-lg shadow-md animate-fade-in">
            <h2 className="text-3xl font-bold mb-2 text-gray-800">Your Itinerary</h2>
            
            {itinerary.itinerary.map((day) => (
              <div key={day.day} className="mb-6">
                <h3 className="text-2xl font-semibold mb-3 text-blue-700 border-b-2 border-blue-200 pb-2">
                  Day {day.day}: {day.title || day.theme}
                </h3>
                <ul className="space-y-4">
                  {day.activities && day.activities.map((activity, index) => (
                    <li key={index} className="p-4 bg-gray-100 rounded-lg list-none">
                      <p className="font-bold text-gray-700">{activity.time}</p>
                      <p className="text-lg text-gray-800 leading-relaxed">{activity.description || activity.activity}</p>
                      {activity.booking_required && <p className="text-sm text-red-500 font-semibold mt-1">Booking Required!</p>}
                      {activity.notes && <p className="text-sm text-gray-500 mt-1">Notes: {activity.notes}</p>}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
