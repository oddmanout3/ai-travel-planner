import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

if (!process.env.GOOGLE_API_KEY) {
  throw new Error("Missing GOOGLE_API_KEY environment variable.");
}
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  // app/api/generate/route.ts

  try {
    const { prompt } = await req.json();

    // app/api/generate/route.ts

    const masterPrompt = `
      You are an expert travel assistant. Create a detailed travel itinerary based on the user's request.
      The output must be a valid JSON object. Do not include any text, just the JSON.
      The root of the JSON object must be a key named "itinerary".
      The value of "itinerary" must be an array of day objects.
      Each day object must have a "day" number and an "activities" array. This structure must be used even if there is only one day.
      Each activity object must have a "time" and a "description".

      User's request: "${prompt}"
    `;

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });
    const result = await model.generateContent(masterPrompt);
    const response = result.response;
    const rawText = response.text();
    
    let jsonString = rawText;

    // --- FINAL SOLUTION ---
    // Check if the response is wrapped in markdown, and if so, extract the JSON.
    if (rawText.startsWith("```json")) {
      const match = rawText.match(/```json\s*([\s\S]*?)\s*```/);
      if (match && match[1]) {
        jsonString = match[1];
      }
    }
    // ----------------------

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