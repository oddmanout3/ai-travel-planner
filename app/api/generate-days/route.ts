// app/api/generate-days/route.ts

import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';
import { DayTheme } from '@/app/types';

if (!process.env.GOOGLE_API_KEY) {
  throw new Error("Missing GOOGLE_API_KEY environment variable.");
}
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

export async function POST(req: Request) {
  try {
    const { destination, duration } = await req.json();

    if (!destination || !duration) {
      return new NextResponse('Missing destination or duration', { status: 400 });
    }

    const masterPrompt = `
      You are an expert travel planner. A user is planning a trip to ${destination}.
      
      IMPORTANT: Create ${duration} day theme options that provide a preview of what each day could offer. These are NOT full itineraries - just themed previews to help the user choose.
      
      For each day theme, you MUST include:
      - A catchy, descriptive theme (e.g., "Ancient Wonders", "Art & Culture", "Hidden Gems", "City Highlights")
      - A one-sentence summary explaining what the day offers
      - 3-5 preview activities that represent the theme (these are just examples, not the full day)
      
      The output must be a valid JSON object. Do not include any text before or after the JSON.
      The root of the JSON object must be a key named "dayThemes", which is an array of day theme objects.

      For each day theme object, you MUST include the following keys:
      - "day": The day number (e.g., 1, 2, 3).
      - "theme": A short, catchy theme for the day (e.g., "Ancient Wonders", "Art & Culture").
      - "summary": A one-sentence summary of what the day entails.
      - "previewActivities": An array of 3-5 activity objects that represent the theme:
        * "id": A unique string ID for the activity
        * "name": The name of the place/activity
        * "description": A brief, one-sentence overview
        * "rating": A number from 1 to 3 (3 = must-do iconic, 2 = highly recommended, 1 = interesting local spot)
        * "imageUrl": A URL to a high-quality, relevant photo (landscape orientation)
        * "location": An object with "latitude" and "longitude" as numbers

      Example themes for different types of destinations:
      - Rome: "Ancient Rome & Colosseum", "Vatican City & Religious Sites", "Renaissance Art & Museums", "Hidden Gems & Local Life"
      - Paris: "Iconic Landmarks", "Art Museums & Culture", "Historic Districts", "Charming Neighborhoods"
      - Tokyo: "Modern Tokyo & Shibuya", "Traditional Asakusa & Senso-ji", "Imperial Palace & Gardens", "Akihabara & Technology"
      - Small cities: "City Highlights & Must-Sees", "Local Culture & Food", "Hidden Treasures", "Relaxation & Views"
      
      Remember: These are just theme previews to help the user choose. The actual detailed itinerary will be created later when they select a theme.
    `;
    
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });
    const result = await model.generateContent(masterPrompt);
    const response = result.response;
    const rawText = response.text();
    
    let jsonString = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
    const structuredPlan = JSON.parse(jsonString);
    
    return NextResponse.json(structuredPlan);

  } catch (error) {
    console.error("Server-side error in /api/generate-days:", error);
    return new NextResponse('Error generating day themes.', { status: 500 });
  }
}
