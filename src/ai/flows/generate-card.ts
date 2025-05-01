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

const GenerateCardInputSchema = z.object({
  topic: z.string().describe('The topic of the card to be generated.'),
  numClues: z.number().describe('The number of clues to generate for the card.'),
});
export type GenerateCardInput = z.infer<typeof GenerateCardInputSchema>;

const GenerateCardOutputSchema = z.object({
  cardId: z.string().describe('A unique identifier for the card.'),
  topic: z.string().describe('The topic of the card.'),
  clues: z.array(z.string()).describe('An array of clues for the card.'),
  answer: z.string().describe('The answer to the card.'),
});
export type GenerateCardOutput = z.infer<typeof GenerateCardOutputSchema>;

export async function generateCard(input: GenerateCardInput): Promise<GenerateCardOutput> {
  return generateCardFlow(input);
}

const generateCardPrompt = ai.definePrompt({
  name: 'generateCardPrompt',
  input: {
    schema: z.object({
      topic: z.string().describe('The topic of the card to be generated.'),
      numClues: z.number().describe('The number of clues to generate for the card.'),
    }),
  },
  output: {
    schema: z.object({
      cardId: z.string().describe('A unique identifier for the card.'),
      topic: z.string().describe('The topic of the card.'),
      clues: z.array(z.string()).describe('An array of clues for the card.'),
      answer: z.string().describe('The answer to the card.'),
    }),
  },
  prompt: `You are an expert in generating cards for the game Perfil Online.

  Your task is to generate a card with a topic, a set of clues, and the correct answer.
  The clues should start difficult and become easier as the game progresses.

  Topic: {{{topic}}}
  Number of Clues: {{{numClues}}}

  Ensure that the answer is directly related to the topic, and the clues gradually reveal the answer.

  Output the cardId, topic, clues array, and the answer in JSON format. The cardId must be a UUID.`, 
});

const generateCardFlow = ai.defineFlow<typeof GenerateCardInputSchema, typeof GenerateCardOutputSchema>(
  {
    name: 'generateCardFlow',
    inputSchema: GenerateCardInputSchema,
    outputSchema: GenerateCardOutputSchema,
  },
  async input => {
    const {output} = await generateCardPrompt(input);
    return output!;
  }
);
