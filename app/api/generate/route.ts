import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize clients
if (!process.env.GOOGLE_API_KEY) {
  throw new Error("Missing GOOGLE_API_KEY environment variable.");
}
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  try {
    const { prompt, dayLength, pacing, likes, dislikes, travelPreference } = await req.json();

    // --- DYNAMICALLY BUILD THE PROMPT ---

    let masterPrompt = `
      You are an expert travel planner. Create a detailed daily itinerary for Day 1 of a trip based on the user's request: "${prompt}".
      The total day length, from the start of the first activity to the end of the last, must be approximately ${dayLength} hours.
      The output must be a valid JSON object. Do not include any text, just the JSON.
      The root of the JSON object must be a key named "itinerary", which is an array of day objects.
      Each day object must have a "day" number and an "activities" array.
    `;

    if (pacing === 'crammed') {
      masterPrompt += `
        The user wants a crammed pace. Fit as many activities as possible into the day, with short durations for each and minimal time between.
      `;
    } else if (pacing === 'relaxed') {
      masterPrompt += `
        The user wants a relaxed pace. Schedule fewer activities, allow for longer durations at each site, and include ample time between activities to prevent rushing.
      `;
    } else { // moderate
      masterPrompt += `
        The user wants a moderate pace. Balance the number of activities with reasonable durations to avoid feeling rushed.
      `;
    }

    if (likes) {
      masterPrompt += `
        Prioritize activities related to the user's likes: ${likes}.
      `;
    }
    if (dislikes) {
      masterPrompt += `
        Completely avoid any activities related to the user's dislikes: ${dislikes}.
      `;
    }

    if (travelPreference === 'walking') {
      masterPrompt += `
        Prioritize walking for all travel segments.
      `;
    } else if (travelPreference === 'fastest') {
      masterPrompt += `
        Prioritize the absolute fastest travel method, using taxis or ride-sharing services.
      `;
    } else { // balanced
      masterPrompt += `
        Prioritize walking. Use public transport only when walking exceeds 20 minutes.
      `;
    }
    
    // app/api/generate/route.ts

    // --- UPDATED FORMATTING RULES ---
    masterPrompt += `
      Each day object must have a "day" number, a "title" for the day's theme, and an "activities" array.
      For each activity in the JSON response, you must include the following keys:
      - "time": The scheduled time for the activity.
      - "description": A brief, one-sentence overview of the activity.
      - "detailed_description": A longer, more detailed paragraph about the activity.
      - "cost": The estimated cost (a number or "Free").
      - "opening_hours": The operating hours for the site (e.g., "9:00 AM - 5:00 PM").
      - "booking_required": A boolean (true or false).
      - "location": An object containing the "name" of the place, and its "latitude" and "longitude" as numbers.
    `;
    
    // --- END OF PROMPT BUILDING ---

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });
    const result = await model.generateContent(masterPrompt);
    const response = result.response;
    const rawText = response.text();
    
    let jsonString = rawText;
    if (rawText.startsWith("```json")) {
      const match = rawText.match(/```json\s*([\s\S]*?)\s*```/);
      if (match && match[1]) {
        jsonString = match[1];
      }
    }
    
    const itineraryObject = JSON.parse(jsonString);
    await supabase
      .from('itineraries')
      .insert([{ user_prompt: prompt, itinerary_data: itineraryObject }]);
    
    return NextResponse.json(itineraryObject); 

  } catch (error) {
    console.error("Server-side error:", error);
    return new NextResponse('Error generating itinerary.', { status: 500 });
  }
}