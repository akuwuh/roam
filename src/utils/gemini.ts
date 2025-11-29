import Constants from 'expo-constants';

const GEMINI_API_KEY = Constants.expoConfig?.extra?.geminiApiKey || '';
// Using Gemini 2.0 Flash with v1beta API (required for 2.0 models)
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';

interface ItineraryRequest {
  destination: string;
  days: number;
  interests?: string;
}

export interface Activity {
  time: string;
  name: string;
  description?: string;
}

export interface Day {
  day: number;
  activities: Activity[];
}

export interface ItineraryData {
  destination: string;
  days: Day[];
  date: string;
}

export async function generateItinerary(request: ItineraryRequest): Promise<ItineraryData> {
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key not configured. Please add it to app.json under extra.geminiApiKey');
  }

  const prompt = `Create a detailed ${request.days}-day travel itinerary for ${request.destination}.
${request.interests ? `Focus on these interests: ${request.interests}.` : ''}

Format the response as a JSON object with this structure:
{
  "days": [
    {
      "day": 1,
      "activities": [
        {
          "time": "9:00 AM",
          "name": "Activity name",
          "description": "Brief description"
        }
      ]
    }
  ]
}

Include 4-6 activities per day with realistic times. Make it practical and enjoyable.`;

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }]
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error Response:', errorText);
      throw new Error(`API request failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('API Response:', JSON.stringify(data, null, 2));
    
    if (!data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text) {
      throw new Error('Invalid response format from API');
    }
    
    const text = data.candidates[0].content.parts[0].text;
    
    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse itinerary from response');
    }
    
    const jsonText = jsonMatch[1] || jsonMatch[0];
    const parsed = JSON.parse(jsonText);

    return {
      destination: request.destination,
      days: parsed.days,
      date: new Date().toLocaleDateString(),
    };
  } catch (error) {
    console.error('Gemini API error:', error);
    throw new Error('Failed to generate itinerary. Check your internet connection and API key.');
  }
}

