// app/utils.ts

import { DiscoveryActivity, ItineraryItem, TravelSegment, UserPreferences } from './types';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export function haversineDistanceKm(a: Coordinates, b: Coordinates): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371; // km
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const aVal = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
  const c = 2 * Math.atan2(Math.sqrt(aVal), Math.sqrt(1 - aVal));
  return R * c;
}

export function estimateTravelMinutes(distanceKm: number, mode: 'walk' | 'transit' | 'drive'): number {
  if (mode === 'walk') {
    const kmPerHour = 4.5; // average
    return Math.max(5, Math.round((distanceKm / kmPerHour) * 60));
  }
  if (mode === 'drive') {
    const kmPerHour = 30; // city estimate
    return Math.max(5, Math.round((distanceKm / kmPerHour) * 60) + 5); // add buffer
  }
  // transit: rough estimate with wait time
  const kmPerHour = 20;
  return Math.max(10, Math.round((distanceKm / kmPerHour) * 60) + 8);
}

export function parseTimeToMinutes(time: string): number {
  const [hh, mm] = time.split(':').map(Number);
  return hh * 60 + mm;
}

export function minutesToTimeString(totalMinutes: number): string {
  const minutesInDay = 24 * 60;
  const normalized = ((totalMinutes % minutesInDay) + minutesInDay) % minutesInDay;
  const hh = Math.floor(normalized / 60).toString().padStart(2, '0');
  const mm = Math.floor(normalized % 60).toString().padStart(2, '0');
  return `${hh}:${mm}`;
}

export function defaultActivityDurationMinutes(rating: 1 | 2 | 3, pace: UserPreferences['defaultPace']): number {
  const base = rating === 3 ? 120 : rating === 2 ? 90 : 60;
  if (pace === 'leisurely') return Math.round(base * 1.2);
  if (pace === 'fast') return Math.round(base * 0.8);
  return base;
}

export function recomputeSchedule(
  orderedActivities: DiscoveryActivity[],
  preferences: UserPreferences,
  existingDurations?: Record<string, number>,
  existingStart?: string
): { items: ItineraryItem[]; segments: TravelSegment[] } {
  const items: ItineraryItem[] = [];
  const segments: TravelSegment[] = [];
  const startMinutes = parseTimeToMinutes(existingStart ?? preferences.dayStartTime);
  const endOfDayMinutes = startMinutes + preferences.dayLengthHours * 60;
  const mode: 'walk' | 'transit' | 'drive' = preferences.defaultTransportMode === 'walking' ? 'walk' : preferences.defaultTransportMode === 'transit' ? 'transit' : 'drive';

  let clock = startMinutes;
  for (let i = 0; i < orderedActivities.length; i++) {
    const activity = orderedActivities[i];
    if (i > 0) {
      const prev = orderedActivities[i - 1];
      const distKm = haversineDistanceKm(prev.location, activity.location);
      const travelMins = estimateTravelMinutes(distKm, mode);
      segments.push({
        fromActivityId: prev.id,
        toActivityId: activity.id,
        minutes: travelMins,
        mode,
        description: `${travelMins} min ${mode === 'walk' ? 'walk' : mode === 'drive' ? 'drive' : 'transit'}`,
        distanceKm: distKm,
        transportDetails: mode === 'transit' ? 'Public transport' : undefined
      });
      clock += travelMins;
    }
    const duration = existingDurations?.[activity.id] ?? defaultActivityDurationMinutes(activity.rating, preferences.defaultPace);
    const startTime = minutesToTimeString(clock);
    clock += duration;
    const endTime = minutesToTimeString(clock);
    items.push({
      id: `${activity.id}-${i}`,
      activityId: activity.id,
      name: activity.name,
      description: activity.description,
      type: 'attraction', // Default type for activities
      durationMinutes: duration,
      startTime,
      endTime,
      location: { latitude: activity.location.latitude, longitude: activity.location.longitude },
      rating: activity.rating,
      imageUrl: activity.imageUrl,
    });
  }

  // Trim if exceeding day length by pushing end times back without changing order
  if (clock > endOfDayMinutes && items.length > 0) {
    const overflow = clock - endOfDayMinutes;
    const last = items[items.length - 1];
    const newDuration = Math.max(30, last.durationMinutes - overflow);
    const lastStart = parseTimeToMinutes(last.startTime);
    last.durationMinutes = newDuration;
    last.endTime = minutesToTimeString(lastStart + newDuration);
  }

  return { items, segments };
}

export function computeCentroid(activities: DiscoveryActivity[]): Coordinates | null {
  if (activities.length === 0) return null;
  const sum = activities.reduce(
    (acc, a) => ({ latitude: acc.latitude + a.location.latitude, longitude: acc.longitude + a.location.longitude }),
    { latitude: 0, longitude: 0 }
  );
  return { latitude: sum.latitude / activities.length, longitude: sum.longitude / activities.length };
}


