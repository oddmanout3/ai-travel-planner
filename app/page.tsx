// app/page.tsx
'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { DiscoveryActivity, DayTheme, DayPlan, TripPlan, UserPreferences } from './types';
import dynamic from 'next/dynamic';
import LoadingScreen from './components/LoadingScreen';
const DayEditor = dynamic(() => import('./DayEditor'), { ssr: false });
import FinalItineraryView from './FinalItineraryView';
import { haversineDistanceKm } from './utils';

export default function Home() {
  // --- STATE ---
  const [destination, setDestination] = useState('Rome, Italy');
  const [durationDays, setDurationDays] = useState<number>(3);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState('');
  const [currentPhase, setCurrentPhase] = useState<'initial' | 'dayThemes' | 'editing' | 'final' | 'optimize'>('initial');
  const [dayThemes, setDayThemes] = useState<DayTheme[]>([]);
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [trip, setTrip] = useState<TripPlan | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences>({ 
    dayStartTime: '09:00', 
    dayLengthHours: 10, 
    defaultPace: 'moderate', 
    defaultTransportMode: 'walking' 
  });

  // --- HANDLERS ---
  const handleStartPlanning = async (e: React.FormEvent) => {
    e.preventDefault();
    const startTime = Date.now();
    setIsLoading(true);
    setLoadingMessage('Generating day themes for your trip...');
    setError('');
    
    try {
      // Generate day themes as previews
      const response = await fetch('/api/generate-days', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destination,
          duration: String(durationDays)
        }),
      });
      
      if (!response.ok) throw new Error(`API Error: ${response.status} ${response.statusText}`);
      const data = await response.json();
      
      // Ensure minimum loading time for better UX
      const elapsed = Date.now() - startTime;
      const minLoadingTime = 1500; // 1.5 seconds
      if (elapsed < minLoadingTime) {
        await new Promise(resolve => setTimeout(resolve, minLoadingTime - elapsed));
      }
      
      setDayThemes(data.dayThemes);
      setTrip({ destination, durationDays, preferences, days: [] });
      setCurrentPhase('dayThemes');
    } catch (err: any) {
      setError(err.message || 'Failed to generate day themes.');
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };

  const handleSelectDayTheme = async (dayTheme: DayTheme) => {
    const startTime = Date.now();
    setIsLoading(true);
    setLoadingMessage(`Creating detailed itinerary for ${dayTheme.theme}...`);
    setError('');
    setEditingDay(dayTheme.day);
    
    try {
      // Generate detailed itinerary for the selected theme
      const response = await fetch('/api/generate-itinerary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destination,
          dayTheme,
          preferences
        }),
      });
      
      if (!response.ok) throw new Error(`API Error: ${response.status} ${response.statusText}`);
      const data = await response.json();
      
      // Ensure minimum loading time for better UX
      const elapsed = Date.now() - startTime;
      const minLoadingTime = 2000; // 2 seconds for detailed itinerary
      if (elapsed < minLoadingTime) {
        await new Promise(resolve => setTimeout(resolve, minLoadingTime - elapsed));
      }
      
      // Add the generated day plan to the trip
      setTrip(prev => {
        if (!prev) return prev;
        const others = prev.days.filter(d => d.day !== dayTheme.day);
        return { ...prev, days: [...others, data.dayPlan].sort((a, b) => a.day - b.day) };
      });
      
      setCurrentPhase('editing');
    } catch (err: any) {
      setError(err.message || 'Failed to generate detailed itinerary.');
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };

  const handleEditorChange = (plan: DayPlan) => {
    setTrip(prev => {
      if (!prev) return prev;
      const others = prev.days.filter(d => d.day !== plan.day);
      return { ...prev, days: [...others, plan].sort((a, b) => a.day - b.day) };
    });
  };

  const handleMakeChanges = async (dayPlan: DayPlan) => {
    // Regenerate the itinerary with current changes
    const dayTheme = dayThemes.find(dt => dt.day === dayPlan.day);
    if (!dayTheme) return;
    
    const startTime = Date.now();
    setIsLoading(true);
    setLoadingMessage('Regenerating your itinerary with AI...');
    setError('');
    
    try {
      const response = await fetch('/api/generate-itinerary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destination,
          dayTheme,
          preferences
        }),
      });
      
      if (!response.ok) throw new Error(`API Error: ${response.status} ${response.statusText}`);
      const data = await response.json();
      
      // Ensure minimum loading time for better UX
      const elapsed = Date.now() - startTime;
      const minLoadingTime = 2000; // 2 seconds for regeneration
      if (elapsed < minLoadingTime) {
        await new Promise(resolve => setTimeout(resolve, minLoadingTime - elapsed));
      }
      
      // Replace the current day plan with the regenerated one
      setTrip(prev => {
        if (!prev) return prev;
        const others = prev.days.filter(d => d.day !== dayPlan.day);
        return { ...prev, days: [...others, data.dayPlan].sort((a, b) => a.day - b.day) };
      });
      
      // Stay in editing mode
      setEditingDay(dayPlan.day);
    } catch (err: any) {
      setError(err.message || 'Failed to regenerate itinerary.');
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };

  const handleFinishDay = (dayPlan: DayPlan) => {
    // Mark day as approved and move to next unplanned day or optimization
    handleEditorChange({ ...dayPlan, approved: true });
    
    const remaining = dayThemes.map(d => d.day).filter(d => !trip?.days.some(dp => dp.day === d && dp.approved));
    const next = remaining.find(d => d !== dayPlan.day);
    
    if (next) {
      // Start planning the next day
      const nextTheme = dayThemes.find(dt => dt.day === next);
      if (nextTheme) {
        handleSelectDayTheme(nextTheme);
      }
    } else {
      // All days planned, move to optimization
      setCurrentPhase('optimize');
    }
  };

  const selectedDayPlan = useMemo(() => {
    if (editingDay == null) return null;
    return trip?.days.find(d => d.day === editingDay);
  }, [editingDay, trip]);

  // Persist trip locally
  useEffect(() => {
    if (trip) {
      try { localStorage.setItem('trip-plan', JSON.stringify(trip)); } catch {}
    }
  }, [trip]);

  // --- RENDER LOGIC ---

  if (currentPhase === 'initial') {
    return (
      <main className="min-h-screen w-full flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-2xl mx-auto bg-white dark:bg-zinc-900 rounded-xl shadow-xl p-6 md:p-10 text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-800 dark:text-white">
              AI Travel Planner 🌍
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300 mt-2 mb-6">
              Tell us where you're going and we'll create the perfect itinerary for you.
            </p>
            <form onSubmit={handleStartPlanning} className="space-y-4 text-left">
              <div>
                <label htmlFor="destination" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Destination</label>
                <input
                  id="destination"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="e.g., Rome, Italy"
                  className="mt-1 w-full p-4 border border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white placeholder-gray-500 rounded-lg text-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all duration-300"
                  disabled={isLoading}
                />
              </div>
              <div>
                <label htmlFor="duration" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Duration (days)</label>
                <input
                  id="duration"
                  type="number"
                  min={1}
                  max={14}
                  value={durationDays}
                  onChange={(e) => setDurationDays(Number(e.target.value))}
                  className="mt-1 w-32 p-3 border border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white rounded-lg text-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  disabled={isLoading}
                />
              </div>
              <button
                type="submit"
                disabled={isLoading || !destination || !durationDays}
                className="w-full text-white p-4 rounded-lg font-semibold text-lg transition-all duration-300 ease-in-out bg-gradient-to-r from-blue-600 to-cyan-500 hover:shadow-xl hover:scale-105 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed disabled:scale-100"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Creating Your Itinerary...
                  </div>
                ) : (
                  'Start Planning'
                )}
              </button>
            </form>
          </div>
          {error && <p className="text-red-600 mt-6 text-center text-lg bg-red-100 p-4 rounded-lg max-w-2xl mx-auto">{error}</p>}
      </main>
    );
  }

  return (
    <main className="min-h-screen w-full font-sans">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 md:py-8">
        <h1 className="text-4xl md:text-5xl font-bold mb-8 text-center bg-gradient-to-r from-blue-600 to-cyan-500 text-transparent bg-clip-text">
          AI Travel Planner 🌍
        </h1>

        {error && <p className="text-red-600 my-4 text-center text-lg bg-red-100 p-4 rounded-lg max-w-4xl mx-auto">{error}</p>}

        {currentPhase === 'dayThemes' && (
          <div className="animate-fade-in">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold">Choose Your Day Themes</h2>
              <p className="text-gray-600 dark:text-gray-300 mt-2">
                Select a day theme to start planning. Each theme will be expanded into a full detailed itinerary.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {dayThemes.map(theme => (
                <div 
                  key={theme.day} 
                  className={`bg-white dark:bg-zinc-900 rounded-xl shadow-md p-6 cursor-pointer hover:shadow-xl hover:scale-105 transition-all ${
                    isLoading && editingDay === theme.day ? 'ring-2 ring-blue-500 ring-offset-2' : ''
                  }`}
                  onClick={() => !isLoading && handleSelectDayTheme(theme)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-blue-600">DAY {theme.day}</span>
                    {isLoading && editingDay === theme.day && (
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    )}
                  </div>
                  <h3 className="text-2xl font-bold mt-1">{theme.theme}</h3>
                  <p className="text-gray-600 dark:text-gray-300 mt-2">{theme.summary}</p>
                  <div className="mt-4 border-t border-gray-200 dark:border-zinc-700 pt-3">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase">PREVIEW ACTIVITIES:</h4>
                    <ul className="text-sm mt-2 space-y-1">
                      {theme.previewActivities?.map(activity => (
                        <li key={activity.id} className="flex items-center gap-2">
                          <span className="text-xs">•</span>
                          <span>{activity.name}</span>
                          {activity.rating === 3 && (
                            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">Must-Do</span>
                          )}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-3 text-xs text-gray-500">
                      {isLoading && editingDay === theme.day ? (
                        <div className="flex items-center gap-2 text-blue-600">
                          <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                          Generating detailed itinerary...
                        </div>
                      ) : (
                        'Click to generate full itinerary with 8-15 activities, food stops, and proper timing'
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {currentPhase === 'editing' && editingDay != null && selectedDayPlan && (
          <div className="animate-fade-in">
            <DayEditor
              dayNumber={editingDay}
              theme={selectedDayPlan.theme}
              summary={selectedDayPlan.summary}
              activities={selectedDayPlan.items.map(item => ({
                id: item.activityId,
                name: item.name,
                description: item.description,
                rating: item.rating || 2,
                imageUrl: item.imageUrl,
                location: item.location
              }))}
              destination={destination}
              preferences={preferences}
              dayPlan={selectedDayPlan}
              onChange={handleEditorChange}
              onMakeChanges={handleMakeChanges}
              onFinishDay={handleFinishDay}
            />
          </div>
        )}

        {currentPhase === 'optimize' && trip && (
          <div className="animate-fade-in">
            <div className="text-center mb-6">
              <h2 className="text-3xl font-bold">Trip Optimization</h2>
              <p className="text-gray-600 dark:text-gray-300">We looked across your days for ways to reduce travel time.</p>
            </div>
            <OptimizationPanel trip={trip} onAccept={(updated) => { setTrip(updated); setCurrentPhase('final'); }} onSkip={() => setCurrentPhase('final')} />
          </div>
        )}

        {currentPhase === 'final' && trip && (
          <div className="animate-fade-in">
            <FinalItineraryView trip={trip} onEditDay={(d) => { setEditingDay(d); setCurrentPhase('editing'); }} />
            <div className="mt-8 flex justify-end">
              <button
                onClick={() => { try { localStorage.setItem('trip-plan', JSON.stringify(trip)); } catch {}; alert('Trip saved for offline access.'); }}
                className="px-6 py-3 rounded-full bg-blue-600 text-white font-semibold hover:bg-blue-700"
              >
                Finalize and Save Trip
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Loading Screen */}
      {isLoading && (
        <LoadingScreen 
          message={loadingMessage} 
          showProgress={true} 
        />
      )}
    </main>
  );
}

// --- Optimization helper UI inside this file for simplicity ---

interface OptimizationProps {
  trip: TripPlan;
  onAccept: (trip: TripPlan) => void;
  onSkip: () => void;
}

function OptimizationPanel({ trip, onAccept, onSkip }: OptimizationProps) {
  const suggestion = computeOptimizationSuggestion(trip);
  if (!suggestion) {
    return (
      <div className="rounded-xl bg-white dark:bg-zinc-900 shadow p-6 text-center">
        <div className="text-lg">No clear improvements found. You're all set!</div>
        <button onClick={onSkip} className="mt-4 px-4 py-2 rounded-full border">Continue</button>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-white dark:bg-zinc-900 shadow p-6">
      <div className="text-xl font-semibold">We found a way to make your trip more efficient!</div>
      <div className="mt-2 text-gray-700 dark:text-gray-300">By making the following change, you could save approximately {Math.round(suggestion.savingMinutes)} minutes of travel time.</div>
      <div className="mt-4 p-4 rounded-lg border border-gray-200 dark:border-zinc-800">
        Suggestion: Move <span className="font-semibold">{suggestion.activityName}</span> from Day {suggestion.fromDay} to Day {suggestion.toDay}.
      </div>
      <div className="mt-4 flex gap-3">
        <button onClick={() => onAccept(applySuggestion(trip, suggestion))} className="px-4 py-2 rounded-full bg-green-600 text-white">Accept Suggestion</button>
        <button onClick={onSkip} className="px-4 py-2 rounded-full border">Decline</button>
      </div>
    </div>
  );
}

function computeOptimizationSuggestion(trip: TripPlan): null | { activityId: string; activityName: string; fromDay: number; toDay: number; savingMinutes: number } {
  // Heuristic: for each activity, compute average distance to its own day vs. to other day centroids
  const dayToCentroid: Record<number, { lat: number; lng: number }> = {};
  for (const d of trip.days) {
    if (d.items.length === 0) continue;
    const avgLat = d.items.reduce((s, it) => s + it.location.latitude, 0) / d.items.length;
    const avgLng = d.items.reduce((s, it) => s + it.location.longitude, 0) / d.items.length;
    dayToCentroid[d.day] = { lat: avgLat, lng: avgLng };
  }
  let best: null | { activityId: string; activityName: string; fromDay: number; toDay: number; savingMinutes: number } = null;
  for (const d of trip.days) {
    for (const item of d.items) {
      for (const other of trip.days) {
        if (other.day === d.day) continue;
        const distToOwn = haversineDistanceKm({ latitude: item.location.latitude, longitude: item.location.longitude }, { latitude: dayToCentroid[d.day].lat, longitude: dayToCentroid[d.day].lng });
        const distToOther = haversineDistanceKm({ latitude: item.location.latitude, longitude: item.location.longitude }, { latitude: dayToCentroid[other.day].lat, longitude: dayToCentroid[other.day].lng });
        const deltaKm = distToOwn - distToOther;
        const minutesSaved = deltaKm * 12; // rough conversion heuristic
        if (minutesSaved > 20) {
          if (!best || minutesSaved > best.savingMinutes) {
            best = { activityId: item.activityId, activityName: item.name, fromDay: d.day, toDay: other.day, savingMinutes: minutesSaved };
          }
        }
      }
    }
  }
  return best;
}

function applySuggestion(trip: TripPlan, s: { activityId: string; fromDay: number; toDay: number }): TripPlan {
  const draft = JSON.parse(JSON.stringify(trip)) as TripPlan;
  const from = draft.days.find(d => d.day === s.fromDay)!;
  const to = draft.days.find(d => d.day === s.toDay)!;
  const itemIdx = from.items.findIndex(i => i.activityId === s.activityId);
  if (itemIdx === -1) return draft;
  const [moved] = from.items.splice(itemIdx, 1);
  // Insert at end of "to" day; note times will be off until recomputed by editor later
  to.items.push(moved);
  return draft;
}