// app/types.ts

export interface DiscoveryActivity {
  id: string;
  name: string;
  description: string;
  rating: 1 | 2 | 3;
  imageUrl?: string;
  location: {
    latitude: number;
    longitude: number;
  };
}

export interface DiscoveryApiResponse {
  activities: DiscoveryActivity[];
}

// --- Day themes as previews (what the user selects from) ---
export interface DayTheme {
  day: number;
  theme: string;
  summary: string;
  previewActivities: DiscoveryActivity[]; // 3-5 activities as preview
}

// --- Hostel information ---
export interface Hostel {
  name: string;
  costPerNight: string; // e.g., "€35-€45"
}

// --- Nearby site information ---
export interface NearbySite {
  name: string;
  distance: string; // e.g., "0.4 km"
  description: string;
}

// --- Enhanced itinerary item with professional details ---
export interface ItineraryItem {
  id: string; // unique within the day plan
  activityId: string; // references DiscoveryActivity.id
  name: string; // English + local translation
  description: string;
  type: 'attraction' | 'food' | 'break' | 'transport' | 'hostel';
  durationMinutes: number;
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  location: {
    latitude: number;
    longitude: number;
  };
  rating?: 1 | 2 | 3;
  imageUrl?: string;
  notes?: string; // Detailed notes including operating hours, cost, nearby sites
  operatingHours?: string; // e.g., "8:30 AM - 7:15 PM"
  cost?: string; // Entry fee or "Free"
  nearbySites?: NearbySite[]; // Array of 2 nearby sites within 1km not visited that day
}

// --- Enhanced travel segment with detailed information ---
export interface TravelSegment {
  fromActivityId: string;
  toActivityId: string;
  minutes: number;
  mode: 'walk' | 'transit' | 'drive';
  description: string; // Detailed travel description with distance, time, cost
  distanceKm: number; // Distance in kilometers
  transportDetails?: string; // Public transport details if applicable
}

// --- Day summary statistics ---
export interface DaySummary {
  totalTravelTime: string; // e.g., "2 hours 10 minutes"
  totalActivityTime: string; // e.g., "11 hours 35 minutes"
  totalCost: string; // e.g., "€42.50"
  distanceCovered: string; // e.g., "12 km walked, 2 km metro"
  recommendations: {
    stayHere: string[]; // 3 sites in current city with star ratings
    dayTrip: string[]; // 2 sites for a day trip
    newTown: string[]; // 2 sites in next city/stop-over
  };
}

// --- Verification details ---
export interface Verification {
  operatingHoursCheck: string; // Verification that all activities are within operating hours
  efficiencyNotes: string; // How the schedule minimizes backtracking
  adjustmentsMade: string; // Any adjustments made to resolve conflicts
}

// --- Full detailed day plan with professional itinerary ---
export interface DayPlan {
  day: number;
  theme: string;
  summary: string;
  hostel: Hostel;
  items: ItineraryItem[];
  segments: TravelSegment[];
  daySummary: DaySummary;
  verification: Verification;
  approved: boolean;
}

// --- User preferences that influence scheduling ---
export interface UserPreferences {
  dayStartTime: string; // e.g., "09:00"
  dayLengthHours: number; // e.g., 10
  defaultPace: 'leisurely' | 'moderate' | 'fast';
  defaultTransportMode: 'walking' | 'transit' | 'mixed';
}

// --- Full trip plan ---
export interface TripPlan {
  destination: string;
  durationDays: number;
  days: DayPlan[];
  preferences: UserPreferences;
}