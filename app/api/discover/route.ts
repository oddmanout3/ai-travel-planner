// app/api/discover/route.ts

import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';
import { DiscoveryApiResponse } from '@/app/types';

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
      You are an expert travel consultant. A user is planning a trip to "${destination}" for ${duration} days.
      Your task is to generate a list of 12-15 popular activities and landmarks for that destination.
      The output must be a valid JSON object. Do not include any text before or after the JSON.
      The root of the JSON object must be a key named "activities", which is an array of activity objects.
      Prioritize well-known landmarks, museums, parks, and unique experiences. Limit restaurant suggestions to a maximum of two, and only if they are iconic.

      For each activity in the JSON response, you MUST include the following keys:
      - "id": A unique, url-safe string identifier for the activity (e.g., "eiffel-tower").
      - "name": The name of the place.
      - "description": A brief, one-sentence overview of the activity.
      - "rating": A number from 1 to 3, representing its importance. 3 means it's a "must-do" iconic landmark, 2 is highly recommended, and 1 is an interesting local spot.
      - "imageUrl": A URL to a high-quality, vibrant, and relevant photo of the activity. The photo should be landscape orientation.
      - "location": An object containing the "latitude" and "longitude" as numbers.
    `;

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });
    const result = await model.generateContent(masterPrompt);
    const response = result.response;
    const rawText = response.text();
    
    let jsonString = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
    
    const discoveryData: DiscoveryApiResponse = JSON.parse(jsonString);
    
    return NextResponse.json(discoveryData); 

  } catch (error) {
    console.error("Server-side error in /api/discover:", error);
    return new NextResponse('Error generating discovery data.', { status: 500 });
  }
}