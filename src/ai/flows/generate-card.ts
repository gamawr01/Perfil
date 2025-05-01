
// src/ai/flows/generate-card.ts
'use server';

/**
 * @fileOverview Gera uma nova carta com dicas para o jogo Perfil Online usando IA.
 *
 * - generateCard - Função que gera uma carta com dicas.
 * - GenerateCardInput - O tipo de entrada para a função generateCard.
 * - GenerateCardOutput - O tipo de retorno para a função generateCard.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';
import { v4 as uuidv4 } from 'uuid'; // Import uuid library

const GenerateCardInputSchema = z.object({
  topic: z.string().describe('A categoria do tópico para a carta a ser gerada (ex: Filmes, História).'),
  numClues: z.number().int().min(1).max(20).default(10).describe('O número de dicas a gerar para a carta (normalmente 10).'),
  // Optional: Add previously generated answers to guide uniqueness, though direct prompting is often better.
  // previousAnswers: z.array(z.string()).optional().describe('Uma lista de respostas já usadas nesta sessão de jogo para evitar repetição.')
});
export type GenerateCardInput = z.infer<typeof GenerateCardInputSchema>;

const GenerateCardOutputSchema = z.object({
  cardId: z.string().uuid().describe('Um identificador UUID único para a carta.'),
  topic: z.string().describe('O tópico da carta, confirmando a categoria de entrada.'),
  clues: z
    .array(z.string())
    .min(1) // Garante pelo menos uma dica
    .describe('Um array de dicas para a carta, ordenadas da mais difícil (índice 0) para a mais fácil.'),
  answer: z.string().nonempty().describe('A resposta específica e concisa para a carta (pessoa, lugar, coisa, evento, etc.).'),
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
      topic: z.string().describe('A categoria do tópico para a carta a ser gerada (ex: Filmes, História).'),
      numClues: z.number().int().min(1).max(20).describe('O número de dicas a gerar para a carta (normalmente 10).'),
      cardId: z.string().uuid().describe('O UUID pré-gerado para esta carta.'), // Input schema expects the cardId
      // previousAnswers: z.array(z.string()).optional().describe('Uma lista de respostas já usadas.') // Uncomment if using this approach
    }),
  },
  output: {
    // Ensure the output schema includes the cardId but relies on the input cardId
     // Removed .uuid() from cardId here as it's not supported by the API for response schemas
     schema: z.object({
       cardId: z.string().describe('O identificador UUID único fornecido para a carta.'),
       topic: z.string().describe('O tópico da carta, correspondendo à categoria de entrada.'),
       clues: z
         .array(z.string())
         .min(1)
         .describe('Um array de dicas, ordenadas da mais difícil (índice 0) para a mais fácil.'),
       answer: z.string().nonempty().describe('A resposta específica e concisa para a carta.'),
     }),
  },
  // Updated Prompt (Translated):
  prompt: `Você é um designer de jogos experiente criando cartas para o jogo de adivinhação "Perfil Online".
Sua tarefa é gerar uma carta ÚNICA e envolvente com base no tópico fornecido.

**Instruções:**
1.  **Determine a Resposta:** Escolha uma pessoa, lugar, coisa, conceito ou evento específico que se encaixe na categoria: **{{{topic}}}**. Esta será a resposta da carta. **Crucialmente, garanta que esta resposta seja distinta e não excessivamente comum ou facilmente adivinhável apenas pelo tópico.** Evite respostas genéricas.
2.  **Gere Dicas:** Crie exatamente **{{{numClues}}}** dicas para a resposta.
    *   **Progressão de Dificuldade:** As dicas DEVEM começar muito difíceis/obscuras (Dica 1) e progressivamente ficar mais fáceis. A Dica {{{numClues}}} deve tornar a resposta bastante óbvia, mas ainda exigir raciocínio.
    *   **Conteúdo da Dica:** As dicas devem ser factuais, interessantes e sugerir a resposta sem revelá-la muito cedo. Evite perguntas de sim/não ou dicas excessivamente diretas nas primeiras dicas.
    *   **Clareza:** Cada dica deve ser uma frase única e clara.
3.  **Formate a Saída:** Estruture sua resposta como um objeto JSON correspondente ao esquema de saída. Use o UUID fornecido para o 'cardId'.

**Tópico de Entrada:** {{{topic}}}
**Número de Dicas:** {{{numClues}}}
**ID da Carta:** {{{cardId}}}

**Exemplo (Tópico: Ciência):**
Resposta: Buraco Negro
Dica 1: Minha existência foi teorizada muito antes de eu ser observado diretamente.
Dica 2: Nada, nem mesmo a luz, pode escapar da minha atração gravitacional depois de cruzar meu horizonte de eventos.
...
Dica 10: Sou frequentemente encontrado no centro de galáxias, incluindo nossa própria Via Láctea.

**Gere a carta agora.**
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
    outputSchema: GenerateCardOutputSchema, // Use the main output schema for TS type safety
  },
  async input => {
    // The input already contains the pre-generated cardId
    const {output} = await generateCardPrompt(input);

    if (!output) {
        // Translated
        throw new Error("IA falhou ao gerar os dados da carta.");
    }
    // Validate the number of clues generated
    const expectedNumClues = input.numClues ?? 10; // Use default if not provided
    if (output.clues.length !== expectedNumClues) {
       // Translated warning
      console.warn(`IA gerou ${output.clues.length} dicas, esperava ${expectedNumClues}. Ajustando...`);
      // Simple truncation or padding (less ideal, but fallback)
      if (output.clues.length > expectedNumClues) {
          output.clues = output.clues.slice(0, expectedNumClues);
      } else {
          // Pad with placeholder - might need better handling
          while(output.clues.length < expectedNumClues) {
               // Translated placeholder
              output.clues.push("(Dica faltando)");
          }
      }
      // Consider throwing an error or retrying if strict count is required
    }

    // Ensure the returned cardId matches the input cardId (it should, as per prompt)
     if (output.cardId !== input.cardId) {
          // Translated warning
         console.warn(`IA retornou um cardId diferente (${output.cardId}) do esperado (${input.cardId}). Usando o ID original.`);
         output.cardId = input.cardId;
     }


    // Validate the final output against the strict GenerateCardOutputSchema
    try {
        return GenerateCardOutputSchema.parse(output);
    } catch (validationError) {
        // Translated error
        console.error("Saída da IA falhou na validação:", validationError);
        throw new Error("A saída da IA não correspondeu ao formato esperado após a geração.");
    }
  }
);

