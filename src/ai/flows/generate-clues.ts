
'use server';

/**
 * @fileOverview Gera dicas de dificuldade crescente para uma determinada carta no jogo PERFIL.
 *
 * - generateClues - Função que gera dicas para a carta.
 * - GenerateCluesInput - O tipo de entrada para a função generateClues.
 * - GenerateCluesOutput - O tipo de retorno para a função generateClues.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const GenerateCluesInputSchema = z.object({
  cardName: z.string().describe('O nome da carta para a qual gerar dicas.'),
  // Updated description for currentClueNumber to 1-20
  currentClueNumber: z.number().int().min(1).max(20).describe('O número da dica atual (1-20).'),
});
export type GenerateCluesInput = z.infer<typeof GenerateCluesInputSchema>;

const GenerateCluesOutputSchema = z.object({
  clue: z.string().describe('A dica gerada para a carta.'),
});
export type GenerateCluesOutput = z.infer<typeof GenerateCluesOutputSchema>;

export async function generateClues(input: GenerateCluesInput): Promise<GenerateCluesOutput> {
  return generateCluesFlow(input);
}

const cluePrompt = ai.definePrompt({
  name: 'cluePrompt',
  input: {
    schema: z.object({
      cardName: z.string().describe('O nome da carta para a qual gerar dicas.'),
      // Updated description for currentClueNumber to 1-20
      currentClueNumber: z.number().int().min(1).max(20).describe('O número da dica atual (1-20).'),
    }),
  },
  output: {
    schema: z.object({
      clue: z.string().describe('A dica gerada para a carta.'),
    }),
  },
  // Translated prompt (no functional change needed here for clue count, handled by input)
  prompt: `Você é o mestre das dicas do jogo Perfil. Seu trabalho é fornecer uma dica sobre a carta para ajudar os jogadores a adivinhá-la. A dificuldade da dica deve aumentar com o número da dica. O nome da carta é: {{{cardName}}}. Esta é a dica número {{{currentClueNumber}}}. Forneça a dica em uma única frase curta. Não revele a resposta. A resposta deve ser apenas a dica em si, nada mais.`,
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

