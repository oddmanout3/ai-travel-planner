// app/api/alternatives/route.ts

import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

if (!process.env.GOOGLE_API_KEY) {
  throw new Error("Missing GOOGLE_API_KEY environment variable.");
}
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

export async function POST(req: Request) {
  try {
    const { destination, excludeActivityIds, referenceActivity, count = 3 } = await req.json();
    if (!destination || !referenceActivity || !excludeActivityIds) {
      return new NextResponse('Missing destination, referenceActivity, or excludeActivityIds', { status: 400 });
    }

    const prompt = `
      You are a travel planning assistant. Suggest ${count} alternative activities in ${destination} that are similar in appeal to the given reference activity, but are not the same and not in the excluded list. Prefer nearby options.
      Return valid JSON only with the key "activities" as an array of activity objects with keys: id, name, description, rating (1-3), imageUrl, location { latitude, longitude }.
      Excluded IDs: ${JSON.stringify(excludeActivityIds)}
      Reference activity: ${JSON.stringify(referenceActivity)}
    `;

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro-latest' });
    const result = await model.generateContent(prompt);
    const rawText = result.response.text();
    const jsonString = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    const data = JSON.parse(jsonString);
    return NextResponse.json(data);

  } catch (error) {
    console.error('Server-side error in /api/alternatives:', error);
    return new NextResponse('Error generating alternatives.', { status: 500 });
  }
}


