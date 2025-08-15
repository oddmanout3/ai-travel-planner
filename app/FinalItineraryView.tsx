// app/FinalItineraryView.tsx
'use client';

import { DayPlan, TripPlan } from './types';

interface FinalItineraryViewProps {
  trip: TripPlan;
  onEditDay: (day: number) => void;
}

export default function FinalItineraryView({ trip, onEditDay }: FinalItineraryViewProps) {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-bold text-blue-600">{trip.destination}</div>
          <div className="text-3xl font-bold">Your Final Itinerary</div>
          <div className="text-gray-600 dark:text-gray-300">{trip.durationDays} days</div>
        </div>
      </div>

      {trip.days.map((day) => (
        <div key={day.day} className="rounded-xl bg-white dark:bg-zinc-900 shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-bold text-blue-600">DAY {day.day}</div>
              <div className="text-2xl font-bold">{day.theme}</div>
              <div className="text-gray-600 dark:text-gray-300">{day.summary}</div>
            </div>
            <button onClick={() => onEditDay(day.day)} className="px-4 py-2 rounded-full border font-semibold">Edit</button>
          </div>

          <ol className="mt-4 space-y-3">
            {day.items.map((item) => (
              <li key={item.id} className="p-3 rounded-lg border border-gray-200 dark:border-zinc-800">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">{item.name}</div>
                  <div className="text-sm font-mono text-gray-600">{item.startTime} - {item.endTime}</div>
                </div>
                <div className="mt-2 text-sm text-gray-600">
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${item.location.latitude},${item.location.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Open in Google Maps
                  </a>
                </div>
              </li>
            ))}
          </ol>
        </div>
      ))}
    </div>
  );
}


