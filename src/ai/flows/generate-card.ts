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
  difficulty: z.enum(['facil', 'medio', 'dificil']).default('medio').describe('O nível de dificuldade da carta e das dicas (facil, medio, dificil).'),
  // Optional: Add previously generated answers to guide uniqueness, though direct prompting is often better.
  // previousAnswers: z.array(z.string()).optional().describe('Uma lista de respostas já usadas nesta sessão de jogo para evitar repetição.')
});
export type GenerateCardInput = z.infer<typeof GenerateCardInputSchema>;

const GenerateCardOutputSchema = z.object({
  cardId: z.string().uuid().describe('Um identificador UUID único para a carta.'),
  topic: z.string().describe('O tópico da carta, confirmando a categoria de entrada.'),
  answerType: z.string().describe('O tipo da resposta (ex: Pessoa, Lugar, Coisa, Evento, Conceito, Filme, Livro).'), // Added answerType
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
      difficulty: z.enum(['facil', 'medio', 'dificil']).describe('O nível de dificuldade da carta e das dicas (facil, medio, dificil).'),
      cardId: z.string().uuid().describe('O UUID pré-gerado para esta carta.'), // Input schema expects the cardId
      // previousAnswers: z.array(z.string()).optional().describe('Uma lista de respostas já usadas.') // Uncomment if using this approach
    }),
  },
  output: {
     schema: z.object({
       cardId: z.string().describe('O identificador UUID único fornecido para a carta.'),
       topic: z.string().describe('O tópico da carta, correspondendo à categoria de entrada.'),
       answerType: z.string().describe('O tipo da resposta (ex: Pessoa, Lugar, Coisa, Evento, Conceito, Filme, Livro).'), // Added answerType to output schema description
       clues: z
         .array(z.string())
         .min(1)
         .describe('Um array de dicas, ordenadas da mais difícil (índice 0) para a mais fácil.'),
       answer: z.string().nonempty().describe('A resposta específica e concisa para a carta.'),
     }),
  },
  // Updated Prompt (Translated & Enhanced for Variety, Difficulty, and Answer Type):
  prompt: `Você é um designer de jogos experiente criando cartas para o jogo de adivinhação "Perfil Online".
Sua tarefa é gerar uma carta ÚNICA e envolvente com base no tópico e na dificuldade fornecidos.

**Instruções:**
1.  **Determine a Resposta:** Escolha uma pessoa, lugar, coisa, conceito, evento, filme, livro, etc. específico que se encaixe na categoria: **{{{topic}}}** e no nível de dificuldade: **{{{difficulty}}}**. Esta será a resposta da carta.
    *   **Critério de Dificuldade:**
        *   **Fácil:** Escolha respostas muito conhecidas, populares e fáceis de identificar dentro do tópico.
        *   **Médio:** Escolha respostas conhecidas, mas talvez não as mais óbvias. Pode exigir um pouco mais de conhecimento específico.
        *   **Difícil:** Escolha respostas mais obscuras, de nicho, técnicas ou menos conhecidas dentro do tópico. Exigirá conhecimento especializado ou raciocínio dedutivo mais profundo.
    *   **Critério de Singularidade:** **Crucialmente, garanta que esta resposta seja distinta e NÃO excessivamente comum ou facilmente adivinhável apenas pelo tópico.** Mesmo no nível fácil, tente variar.
    *   **Incentivo à Variedade:** **Procure por respostas mais específicas, menos óbvias ou de nicho dentro do tópico e dificuldade fornecidos.** Evite as respostas mais clichês ou os primeiros exemplos que vêm à mente. Queremos variedade entre as cartas geradas ao longo do tempo.
    *   **Exemplo de Pensamento (Tópico: Filmes, Dificuldade: Difícil):** Em vez de "O Poderoso Chefão", considere "Stalker (1979)", "Primer (2004)" ou um filme experimental/cult específico.
    *   **Exemplo de Pensamento (Tópico: Ciência, Dificuldade: Fácil):** "Gravidade" ou "Fotossíntese" são adequados.
2.  **Determine o Tipo da Resposta:** Classifique a resposta que você escolheu em uma categoria geral. Use um termo simples e direto como 'Pessoa', 'Lugar', 'Coisa', 'Evento', 'Conceito', 'Filme', 'Livro', 'Animal', 'Comida', etc. Defina o campo 'answerType' com esta classificação.
3.  **Gere Dicas:** Crie exatamente **{{{numClues}}}** dicas para a resposta.
    *   **Progressão de Dificuldade das Dicas:** As dicas DEVEM começar muito difíceis/obscuras (Dica 1) e progressivamente ficar mais fáceis. A Dica {{{numClues}}} deve tornar a resposta bastante óbvia, mas ainda exigir raciocínio. A dificuldade geral das dicas deve refletir a dificuldade **{{{difficulty}}}** selecionada (dicas mais obscuras no início para difícil, mais diretas no final para fácil).
    *   **Conteúdo da Dica:** As dicas devem ser factuais, interessantes e sugerir a resposta sem revelá-la muito cedo. Evite perguntas de sim/não ou dicas excessivamente diretas nas primeiras dicas, especialmente para dificuldades mais altas.
    *   **Clareza:** Cada dica deve ser uma frase única e clara.
4.  **Formate a Saída:** Estruture sua resposta como um objeto JSON correspondente ao esquema de saída. Use o UUID fornecido para o 'cardId'. Certifique-se de incluir o campo 'answerType' com a classificação determinada na Etapa 2.

**Tópico de Entrada:** {{{topic}}}
**Dificuldade de Entrada:** {{{difficulty}}}
**Número de Dicas:** {{{numClues}}}
**ID da Carta:** {{{cardId}}}

**Exemplo (Tópico: Ciência, Dificuldade: Médio):**
Resposta: Tardígrado (Urso d'água)
Tipo da Resposta: Animal
Dica 1: Sou um organismo microscópico conhecido pela minha resistência extrema.
Dica 2: Posso entrar em um estado de criptobiose para sobreviver a condições ambientais adversas.
...
Dica 10: Sou frequentemente chamado de 'urso d'água' devido à minha aparência segmentada e capacidade de sobreviver em ambientes aquáticos.

**Gere a carta agora, focando em uma resposta adequada à dificuldade, menos comum se apropriado, e incluindo o tipo da resposta.**
`,
});


const generateCardFlow = ai.defineFlow<
  // Input now includes cardId and difficulty
  z.infer<typeof generateCardPrompt.inputSchema>,
  typeof GenerateCardOutputSchema
>(
  {
    name: 'generateCardFlow',
    inputSchema: generateCardPrompt.inputSchema, // Use the prompt's input schema which includes cardId and difficulty
    outputSchema: GenerateCardOutputSchema, // Use the main output schema for TS type safety
  },
  async input => {
    // The input already contains the pre-generated cardId and the selected difficulty
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
        // Ensure answerType is present, provide a default if missing (should not happen ideally)
        if (!output.answerType) {
            console.warn("IA não forneceu 'answerType'. Usando 'Desconhecido'.");
            output.answerType = 'Desconhecido';
        }
        return GenerateCardOutputSchema.parse(output);
    } catch (validationError) {
        // Translated error
        console.error("Saída da IA falhou na validação:", validationError);
        throw new Error("A saída da IA não correspondeu ao formato esperado após a geração.");
    }
  }
);
