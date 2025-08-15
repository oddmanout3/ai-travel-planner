// app/api/generate-itinerary/route.ts

import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';
import { DayPlan, UserPreferences } from '@/app/types';

if (!process.env.GOOGLE_API_KEY) {
  throw new Error("Missing GOOGLE_API_KEY environment variable.");
}
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

export async function POST(req: Request) {
  try {
    const { destination, dayTheme, preferences } = await req.json();

    if (!destination || !dayTheme || !preferences) {
      return new NextResponse('Missing destination, dayTheme, or preferences', { status: 400 });
    }

    const masterPrompt = `
You are an expert AI travel planner tasked with creating a detailed daily itinerary for a trip. Generate a single-day itinerary for Day ${dayTheme.day} in ${destination}, adhering to the preferences and rules below.

IMPORTANT: This must be a PROFESSIONAL-GRADE itinerary with the same level of detail as a paid travel service would provide.

TRIP CONTEXT: This is Day ${dayTheme.day} of a multi-day trip focusing on cultural, historical, and scenic sites, must-do attractions, and a limited number of top museums or tours.

HOSTEL: Start and end the day at a well-reviewed, social hostel in ${destination}. Include the hostel name and estimated nightly cost.

DAY LENGTH: ${preferences.defaultPace === 'fast' ? 'Fast-paced, 13+ hours' : preferences.defaultPace === 'leisurely' ? 'Leisurely pace, 10+ hours' : 'Moderate pace, 11+ hours'} (start to finish, including travel and activities), with minimal travel time between sites by clustering nearby locations and no downtime.

TRAVEL MODE: Prioritize walking; use public transport only when walking exceeds 20 minutes. For each segment, provide:
- Exact travel time and distance (in km, e.g., "5-minute walk, 0.3 km")
- Public transport details (frequency, cost, time saved vs. walking in parentheses)

EFFICIENCY: Minimize backtracking by clustering sites geographically, progressing logically, and ending near the hostel.

STAR RATING: Assign star ratings to prioritize sites:
- *** (top-tier, must-see landmarks)
- ** (popular but secondary sites)  
- * (nice-to-see, less critical sites)

SCHEDULING RULES:
- Start with breakfast at the hostel (15 minutes) and end at the hostel
- Schedule lunch before 3:30 PM and dinner before 9:00 PM (30 minutes each, excluding travel time)
- Schedule all activities and meals strictly within their operating hours
- First activity after breakfast must start exactly at opening time
- Major sites: 1-3 hours, Must-see sites: 30 minutes, Minor sites: 5-20 minutes
- Add minor sites (5-20 minutes) along the route within 0.5 km to maximize pace
- No mid-day breaks, free time, or hostel stops

FORMAT REQUIREMENTS:
The output must be a valid JSON object with a root key named "dayPlan". The dayPlan object must include:

- "day": The day number
- "theme": The selected theme  
- "summary": A brief summary of the day
- "hostel": Object with "name" and "costPerNight"
- "items": Array of itinerary items with:
  * "id": Unique identifier
  * "activityId": Activity reference
  * "name": Name of the place/activity (English + local translation)
  * "description": Detailed description
  * "type": One of "attraction", "food", "break", "transport", "hostel"
  * "durationMinutes": How long to spend there
  * "startTime": When to start (HH:MM format)
  * "endTime": When to finish (HH:MM format)
  * "location": Object with latitude and longitude
  * "rating": 1-3 rating if applicable
  * "imageUrl": Image URL if available
  * "notes": Detailed notes including operating hours, cost, nearby sites
  * "operatingHours": Opening hours (e.g., "8:30 AM - 7:15 PM")
  * "cost": Entry fee or "Free"
  * "nearbySites": Array of 2 nearby sites within 1km not visited that day

- "segments": Array of travel segments between activities with:
  * "fromActivityId": Previous activity ID
  * "toActivityId": Next activity ID  
  * "minutes": Travel time in minutes
  * "mode": "walk", "transit", or "drive"
  * "description": Detailed travel description with distance, time, cost
  * "distanceKm": Distance in kilometers
  * "transportDetails": Public transport details if applicable

- "daySummary": Object with:
  * "totalTravelTime": Sum of all travel times
  * "totalActivityTime": Total time on activities and meals
  * "totalCost": Sum of entry fees and meal costs
  * "distanceCovered": Total distance walked and via transport
  * "recommendations": Object with "stayHere", "dayTrip", "newTown" options

- "verification": Object with:
  * "operatingHoursCheck": Verification that all activities are within operating hours
  * "efficiencyNotes": How the schedule minimizes backtracking
  * "adjustmentsMade": Any adjustments made to resolve conflicts

- "approved": false (always false initially)

EXAMPLE ITINERARY STRUCTURE:
The AI should generate a complete day with 8-15 activities including:
- Hostel breakfast
- Major attractions (*** sites)
- Secondary attractions (** sites) 
- Minor sites (* sites) along the route
- Lunch at a local restaurant
- Dinner at a local restaurant
- Return to hostel
- Optional evening snack/activity

Each activity must have realistic operating hours, costs, and detailed descriptions. The schedule must be geographically logical with minimal backtracking.

Ensure the day meets the specified hour requirement and provides a comprehensive, professional travel experience.
    `;
    
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });
    const result = await model.generateContent(masterPrompt);
    const response = result.response;
    const rawText = response.text();
    
    let jsonString = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
    const itineraryData = JSON.parse(jsonString);
    
    return NextResponse.json(itineraryData);

  } catch (error) {
    console.error("Server-side error in /api/generate-itinerary:", error);
    return new NextResponse('Error generating detailed itinerary.', { status: 500 });
  }
}
