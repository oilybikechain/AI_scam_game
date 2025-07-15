// src/routes/api/scenario/+server.ts
import { json } from "@sveltejs/kit";
// 1. FIX: Import Schema and SchemaType from the SDK
import { GoogleGenerativeAI, type GenerativeModel, type Schema, SchemaType } from '@google/generative-ai';
import { env } from '$env/dynamic/private';

// 2. FIX: Handle potential undefined API key more robustly
const API_KEY: string = env.AI_STUDIO_API_KEY || ''; // Provide a default empty string or throw an error
if (!API_KEY) {
  console.error("AI_STUDIO_API_KEY environment variable is not set.");
  // In a production app, you might want to throw an error or handle this more gracefully.
  // For development, an empty string will cause the SDK to fail, but clearly indicates the problem.
}

const genAI = new GoogleGenerativeAI(API_KEY);

const model: GenerativeModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// 3. FIX: Use SchemaType enum values for the 'type' properties
const jsonSchema: Schema = {
  type: SchemaType.OBJECT, // Use SchemaType.OBJECT
  properties: {
    scenario: {
      type: SchemaType.STRING, // Use SchemaType.STRING
      description: "The full scenario description, including character details, setting, and the event unfolding. This narrative is crafted to be ambiguous, making it unclear whether it's a scam or genuine. All details that serve as clues are embedded directly within this narrative."
    },
    decision_point: {
      type: SchemaType.STRING, // Use SchemaType.STRING
      description: "A clear question or choice the character faces within the scenario, requiring the player to make a decision."
    },
    is_scam: {
      type: SchemaType.BOOLEAN, // Use SchemaType.BOOLEAN
      description: "TRUE if the scenario is, in fact, a scam. FALSE if it is a genuine situation. This field is for internal game logic ONLY and must NOT be revealed to the player immediately."
    },
    explanation: {
      type: SchemaType.ARRAY, // Use SchemaType.ARRAY
      items: {
        type: SchemaType.STRING, // Use SchemaType.STRING
        description: "A concrete point of evidence from the scenario, either a red flag (for scam) or a confirmation of legitimacy (for genuine)."
      },
      description: "A list of bullet points detailing the specific evidence from the scenario that confirms whether it was a scam or genuine. Each point should be a clear, concrete observation."
    }
  },
  required: [
    "scenario",
    "decision_point",
    "is_scam",
    "explanation"
  ]
};

const systemInstructions = `You are a master storyteller for a game, generating short, immersive scenarios.
Your core task is to create situations where the player's character faces an ambiguous situation. It should be challenging for the player to determine if the situation is a scam or a genuine opportunity/event.

Each time the user prompts you, you MUST randomly decide whether the hidden truth of the scenario is 'scam' (is_scam: true) or 'genuine' (is_scam: false). Aim for roughly a 50/50 split over time, but the individual decision for each prompt should be random.

Your output MUST always strictly adhere to the provided JSON schema.

For scenarios where the hidden truth is 'scam' (is_scam: true):
- The 'scenario' field MUST contain all necessary details, including character information, setting, and the full event. Crucially, it must seamlessly embed subtle red flags and suspicious elements within its narrative without explicitly pointing them out.
- The 'scenario' narrative must be subtly deceptive, presenting an offer or situation that initially seems plausible or even appealing.
- The 'decision_point' should require the character to act, with potential negative consequences if they misinterpret the situation.
- The 'explanation' should be a list of concrete points. Each point must clearly state a specific reason *why* it was a scam, explicitly referencing and highlighting the red flags embedded in the 'scenario'. For example: "The offer was unusually good for [item]." or "They insisted on payment via [method] which is hard to trace."

For scenarios where the hidden truth is 'genuine' (is_scam: false):
- The 'scenario' field MUST contain all necessary details, including character information, setting, and the full event. It should include perfectly normal details and elements that *could be misinterpreted* as suspicious by an overly cautious player, but are, in fact, legitimate.
- The 'scenario' narrative should describe a perfectly legitimate, everyday, or even beneficial situation or offer.
- The 'decision_point' should require the character to act, with potential positive outcomes if they engage, or missed opportunities if they are too cautious.
- The 'explanation' should be a list of concrete points. Each point must clearly state a specific reason *why* it was genuine, explicitly referencing and clarifying details from the 'scenario' that confirm its legitimacy or explain why seemingly suspicious elements were actually normal. For example: "The company had a verifiable online presence." or "The terms of the offer were clearly outlined in writing."

In ALL scenarios (regardless of the hidden 'is_scam' truth):
- The 'scenario' field is paramount for creating ambiguity. All information the player needs to guess must be embedded naturally within this narrative.
- The tone of the 'scenario' and 'decision_point' should be neutral, objective, and descriptive, not leading the player towards one conclusion or another.
- Do NOT explicitly state or hint in the 'scenario' or 'decision_point' whether the situation is a scam or genuine. The is_scam and 'explanation' fields are for your internal game logic and post-decision reveal only.
- Focus on relatable, everyday situations to enhance immersion.`;

export async function POST({ request }) {
   try {
    const { prompt } = await request.json();

    if (!prompt) {
      return json({ error: 'Prompt is required' }, { status: 400 });
    }

    const chat = model.startChat({
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: jsonSchema,
        },
    });

    const result = await chat.sendMessage(systemInstructions + "\n\n" + prompt);
    const response = await result.response;
    const jsonText = response.text();

    console.log("Raw AI response text:", jsonText);

    let parsedResponse;
    try {
        parsedResponse = JSON.parse(jsonText);
    } catch (parseError) {
        console.error("Failed to parse AI response as JSON:", parseError);
        return json({ error: 'AI response was not valid JSON.', rawResponse: jsonText, parseError: (parseError instanceof Error) ? parseError.message : String(parseError) }, { status: 500 });
    }

    if (!parsedResponse || typeof parsedResponse.scenario !== 'string' || typeof parsedResponse.decision_point !== 'string' || typeof parsedResponse.is_scam !== 'boolean' || !Array.isArray(parsedResponse.explanation) || !parsedResponse.explanation.every((item: any) => typeof item === 'string')) {
        console.error("AI response missing required fields or has wrong types:", parsedResponse);
        return json({
            error: 'AI response missing required fields or has wrong types.',
            data: parsedResponse,
            expected: {
                scenario: 'string',
                decision_point: 'string',
                is_scam: 'boolean',
                explanation: 'array of strings'
            }
        }, { status: 500 });
    }

    return json(parsedResponse, { status: 200 });

  } catch (error: unknown) {
    console.error("Error generating AI content:", error);

    return json({
      error: 'Failed to generate AI content.',
      details: (error instanceof Error) ? error.message : 'An unknown error occurred.',
      stack: import.meta.env.PROD ? undefined : (error instanceof Error ? error.stack : undefined)
    }, { status: 500 });
  }
}