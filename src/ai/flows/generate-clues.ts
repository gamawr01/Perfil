'use server';

/**
 * @fileOverview Generates clues of increasing ease for a given card in the PERFIL game.
 *
 * - generateClues - A function that generates clues for the card.
 * - GenerateCluesInput - The input type for the generateClues function.
 * - GenerateCluesOutput - The return type for the generateClues function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const GenerateCluesInputSchema = z.object({
  cardName: z.string().describe('The name of the card for which to generate clues.'),
  currentClueNumber: z.number().describe('The current clue number (1-10).'),
});
export type GenerateCluesInput = z.infer<typeof GenerateCluesInputSchema>;

const GenerateCluesOutputSchema = z.object({
  clue: z.string().describe('The generated clue for the card.'),
});
export type GenerateCluesOutput = z.infer<typeof GenerateCluesOutputSchema>;

export async function generateClues(input: GenerateCluesInput): Promise<GenerateCluesOutput> {
  return generateCluesFlow(input);
}

const cluePrompt = ai.definePrompt({
  name: 'cluePrompt',
  input: {
    schema: z.object({
      cardName: z.string().describe('The name of the card for which to generate clues.'),
      currentClueNumber: z.number().describe('The current clue number (1-10).'),
    }),
  },
  output: {
    schema: z.object({
      clue: z.string().describe('The generated clue for the card.'),
    }),
  },
  prompt: `You are the clue master for the game Perfil. Your job is to provide a clue about the card to help the players guess the card. The difficulty of the clue should increase with the clue number. The card name is: {{{cardName}}}. This is clue number {{{currentClueNumber}}}. Provide the clue in a single short sentence.  Do not reveal the answer. The response should just be the clue itself, nothing more.`,
});

const generateCluesFlow = ai.defineFlow<
  typeof GenerateCluesInputSchema,
  typeof GenerateCluesOutputSchema
>(
  {
    name: 'generateCluesFlow',
    inputSchema: GenerateCluesInputSchema,
    outputSchema: GenerateCluesOutputSchema,
  },
  async input => {
    const {output} = await cluePrompt(input);
    return output!;
  }
);
