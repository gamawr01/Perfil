
// src/ai/flows/generate-card.ts
'use server';

/**
 * @fileOverview Generates a new card with clues for the Perfil Online game using AI.
 *
 * - generateCard - A function that generates a card with clues.
 * - GenerateCardInput - The input type for the generateCard function.
 * - GenerateCardOutput - The return type for the generateCard function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';
import { v4 as uuidv4 } from 'uuid'; // Import uuid library

const GenerateCardInputSchema = z.object({
  topic: z.string().describe('The topic category for the card to be generated (e.g., Movies, History).'),
  numClues: z.number().int().min(1).max(20).describe('The number of clues to generate for the card (typically 10).'),
  // Optional: Add previously generated answers to guide uniqueness, though direct prompting is often better.
  // previousAnswers: z.array(z.string()).optional().describe('A list of answers already used in this game session to avoid repetition.')
});
export type GenerateCardInput = z.infer<typeof GenerateCardInputSchema>;

const GenerateCardOutputSchema = z.object({
  cardId: z.string().uuid().describe('A unique UUID identifier for the card.'),
  topic: z.string().describe('The topic of the card, confirming the input category.'),
  clues: z
    .array(z.string())
    .min(1) // Ensure at least one clue
    .describe('An array of clues for the card, ordered from hardest (index 0) to easiest.'),
  answer: z.string().nonempty().describe('The specific, concise answer to the card (person, place, thing, event, etc.).'),
});
export type GenerateCardOutput = z.infer<typeof GenerateCardOutputSchema>;

export async function generateCard(input: GenerateCardInput): Promise<GenerateCardOutput> {
  // Generate UUID within the exported function before calling the flow
  const cardId = uuidv4();
  const flowOutput = await generateCardFlow({...input, cardId}); // Pass cardId to the flow
  return flowOutput;
}

const generateCardPrompt = ai.definePrompt({
  name: 'generateCardPrompt',
  input: {
    schema: z.object({
      topic: z.string().describe('The topic category for the card to be generated (e.g., Movies, History).'),
      numClues: z.number().int().min(1).max(20).describe('The number of clues to generate for the card (typically 10).'),
      cardId: z.string().uuid().describe('The pre-generated UUID for this card.'), // Input schema expects the cardId
      // previousAnswers: z.array(z.string()).optional().describe('A list of answers already used.') // Uncomment if using this approach
    }),
  },
  output: {
    // Ensure the output schema includes the cardId but relies on the input cardId
     schema: z.object({
       cardId: z.string().uuid().describe('The unique UUID identifier provided for the card.'),
       topic: z.string().describe('The topic of the card, matching the input category.'),
       clues: z
         .array(z.string())
         .min(1)
         .describe('An array of clues, ordered from hardest (index 0) to easiest.'),
       answer: z.string().nonempty().describe('The specific, concise answer to the card.'),
     }),
  },
  // Updated Prompt:
  prompt: `You are an expert game designer creating cards for the guessing game "Perfil Online".
Your task is to generate a UNIQUE and engaging card based on the given topic.

**Instructions:**
1.  **Determine the Answer:** Choose a specific person, place, thing, concept, or event that fits the category: **{{{topic}}}**. This will be the card's answer. **Crucially, ensure this answer is distinct and not overly common or easily guessable from the topic alone.** Avoid generic answers.
2.  **Generate Clues:** Create exactly **{{{numClues}}}** clues for the answer.
    *   **Difficulty Progression:** The clues MUST start very difficult/obscure (Clue 1) and progressively get easier. Clue {{{numClues}}} should make the answer quite obvious, but still require thought.
    *   **Clue Content:** Clues should be factual, interesting, and hint at the answer without giving it away too early. Avoid yes/no questions or overly direct hints in early clues.
    *   **Clarity:** Each clue should be a single, clear sentence.
3.  **Format Output:** Structure your response as a JSON object matching the output schema. Use the provided UUID for the 'cardId'.

**Input Topic:** {{{topic}}}
**Number of Clues:** {{{numClues}}}
**Card ID:** {{{cardId}}}

**Example (Topic: Science):**
Answer: Black Hole
Clue 1: My existence was theorized long before I was directly observed.
Clue 2: Nothing, not even light, can escape my gravitational pull once it crosses my event horizon.
...
Clue 10: I am often found at the center of galaxies, including our own Milky Way.

**Generate the card now.**
`,
});


const generateCardFlow = ai.defineFlow<
  // Input now includes cardId
  z.infer<typeof generateCardPrompt.inputSchema>,
  typeof GenerateCardOutputSchema
>(
  {
    name: 'generateCardFlow',
    inputSchema: generateCardPrompt.inputSchema, // Use the prompt's input schema which includes cardId
    outputSchema: GenerateCardOutputSchema,
  },
  async input => {
    // The input already contains the pre-generated cardId
    const {output} = await generateCardPrompt(input);

    if (!output) {
        throw new Error("AI failed to generate card data.");
    }
    // Validate the number of clues generated
    if (output.clues.length !== input.numClues) {
      console.warn(`AI generated ${output.clues.length} clues, expected ${input.numClues}. Adjusting...`);
      // Simple truncation or padding (less ideal, but fallback)
      if (output.clues.length > input.numClues) {
          output.clues = output.clues.slice(0, input.numClues);
      } else {
          // Pad with placeholder - might need better handling
          while(output.clues.length < input.numClues) {
              output.clues.push("(Missing clue)");
          }
      }
      // Consider throwing an error or retrying if strict count is required
    }

    // Ensure the returned cardId matches the input cardId (it should, as per prompt)
     if (output.cardId !== input.cardId) {
         console.warn(`AI returned a different cardId (${output.cardId}) than expected (${input.cardId}). Using the original ID.`);
         output.cardId = input.cardId;
     }


    return output;
  }
);
