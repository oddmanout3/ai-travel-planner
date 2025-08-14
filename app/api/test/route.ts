// app/api/test/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  const testObject = { message: "Success! JSON is working." };
  console.log("SENDING TEST JSON:", testObject);
  return NextResponse.json(testObject);
}