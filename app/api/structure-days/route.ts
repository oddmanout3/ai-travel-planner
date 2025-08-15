// app/api/structure-days/route.ts

import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';
import { DiscoveryActivity } from '@/app/types';

// Define the structure we expect the AI to return
export interface DayOption {
  day: number;
  theme: string; // e.g., "Historic Rome" or "Museum Mile"
  summary: string; // A brief one-sentence summary of the day
  activityIds: string[]; // The IDs of the activities clustered into this day
}

if (!process.env.GOOGLE_API_KEY) {
  throw new Error("Missing GOOGLE_API_KEY environment variable.");
}
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

export async function POST(req: Request) {
  try {
    const { activities, duration, destination } = await req.json() as { 
      activities: DiscoveryActivity[], 
      duration: string, 
      destination: string 
    };

    if (!activities || !duration || !destination) {
      return new NextResponse('Missing activities, duration, or destination', { status: 400 });
    }

    const masterPrompt = `
      You are an expert travel planner. A user is planning a ${duration}-day trip to ${destination}.
      They have selected the following activities they are interested in:
      ${JSON.stringify(activities, null, 2)}

      IMPORTANT: First, analyze the destination and trip duration to decide on the best planning approach:

      1. For short trips (1-2 days) or cities with concentrated attractions: Create "Highlights" focused days that maximize iconic experiences
      2. For longer trips (3+ days) or cities with spread-out attractions: Use geographical clustering to minimize travel time

      Based on this analysis, create ${duration} themed day options. Each day should have:
      - A catchy, descriptive theme (e.g., "Ancient Wonders", "Art & Culture", "Hidden Gems", "City Highlights")
      - A one-sentence summary explaining what the day offers
      - Activities grouped logically (either by proximity for efficiency OR by theme for highlights)

      For clustering destinations (like Rome, Paris, Tokyo), focus on geographical proximity to reduce travel time.
      For highlights destinations (like small cities or short trips), focus on thematic grouping and must-see experiences.

      The output must be a valid JSON object. Do not include any text before or after the JSON.
      The root of the JSON object must be a key named "dayOptions", which is an array of day option objects.

      For each day option object, you MUST include the following keys:
      - "day": The day number (e.g., 1, 2, 3).
      - "theme": A short, catchy theme for the day (e.g., "Ancient Wonders", "Art & Culture").
      - "summary": A one-sentence summary of what the day entails.
      - "activityIds": An array of the string IDs for the activities assigned to that day. Ensure every selected activity ID is used exactly once across all days.

      Example themes for different types of destinations:
      - Rome: "Ancient Rome & Colosseum", "Vatican City & Religious Sites", "Renaissance Art & Museums", "Hidden Gems & Local Life"
      - Paris: "Iconic Landmarks", "Art Museums & Culture", "Historic Districts", "Charming Neighborhoods"
      - Tokyo: "Modern Tokyo & Shibuya", "Traditional Asakusa & Senso-ji", "Imperial Palace & Gardens", "Akihabara & Technology"
      - Small cities: "City Highlights & Must-Sees", "Local Culture & Food", "Hidden Treasures", "Relaxation & Views"
    `;
    
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });
    const result = await model.generateContent(masterPrompt);
    const response = result.response;
    const rawText = response.text();
    
    let jsonString = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
    const structuredPlan = JSON.parse(jsonString);
    
    return NextResponse.json(structuredPlan);

  } catch (error) {
    console.error("Server-side error in /api/structure-days:", error);
    return new NextResponse('Error structuring day options.', { status: 500 });
  }
}