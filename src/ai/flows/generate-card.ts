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
  // Changed default and description for numClues to 20
  numClues: z.number().int().min(1).max(20).default(20).describe('O número de dicas a gerar para a carta (padrão 20).'),
  difficulty: z.enum(['facil', 'medio', 'dificil']).default('medio').describe('O nível de dificuldade da carta e das dicas (facil, medio, dificil).'),
  // Optional: Add previously generated answers to guide uniqueness, though direct prompting is often better.
  // previousAnswers: z.array(z.string()).optional().describe('Uma lista de respostas já usadas nesta sessão de jogo para evitar repetição.')
});
export type GenerateCardInput = z.infer<typeof GenerateCardInputSchema>;

const GenerateCardOutputSchema = z.object({
  cardId: z.string().describe('Um identificador UUID único para a carta.'), // Kept as string, UUID generated before flow call
  topic: z.string().describe('O tópico da carta, confirmando a categoria de entrada.'),
  answerType: z.string().describe('O tipo da resposta (ex: Pessoa, Lugar, Coisa, Evento, Conceito, Filme, Livro).'), // Added answerType
  clues: z
    .array(z.string())
    .min(20) // Ensure exactly 20 clues
    .max(20) // Ensure exactly 20 clues
    .describe('Um array de exatamente 20 dicas para a carta, ordenadas da mais difícil (índice 0) para a mais fácil.'),
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
      // Changed description for numClues to 20
      numClues: z.number().int().min(1).max(20).describe('O número de dicas a gerar para a carta (normalmente 20).'),
      difficulty: z.enum(['facil', 'medio', 'dificil']).describe('O nível de dificuldade da carta e das dicas (facil, medio, dificil).'),
      cardId: z.string().describe('O UUID pré-gerado para esta carta.'), // Input schema expects the cardId - keep as string
      // previousAnswers: z.array(z.string()).optional().describe('Uma lista de respostas já usadas.') // Uncomment if using this approach
    }),
  },
  output: {
     // Removed format: 'uuid' to avoid potential validation errors from the model. UUID is generated externally.
     schema: z.object({
       cardId: z.string().describe('O identificador único fornecido para a carta.'), // Output description expects string
       topic: z.string().describe('O tópico da carta, correspondendo à categoria de entrada.'),
       answerType: z.string().describe('O tipo da resposta (ex: Pessoa, Lugar, Coisa, Evento, Conceito, Filme, Livro).'), // Added answerType to output schema description
       clues: z
         .array(z.string())
         .min(20) // Ensure exactly 20 clues in output schema
         .max(20) // Ensure exactly 20 clues in output schema
         .describe('Um array de exatamente 20 dicas, ordenadas da mais difícil (índice 0) para a mais fácil.'),
       answer: z.string().nonempty().describe('A resposta específica e concisa para a carta.'),
     }),
  },
  // Updated Prompt (Translated & Enhanced for Variety, Difficulty, Answer Type, and 20 Clues):
  prompt: `Você é um designer de jogos experiente criando cartas para o jogo de adivinhação "Perfil Online".
Sua tarefa é gerar uma carta ÚNICA e envolvente com base no tópico e na dificuldade fornecidos, contendo **exatamente 20 dicas**.

**Instruções:**
1.  **Determine a Resposta:** Escolha uma pessoa, lugar, coisa, conceito, evento, filme, livro, etc. específico que se encaixe na categoria: **{{{topic}}}** e no nível de dificuldade: **{{{difficulty}}}**. Esta será a resposta da carta.
    *   **Critério de Dificuldade:**
        *   **Fácil:** Escolha respostas muito conhecidas, populares e fáceis de identificar dentro do tópico.
        *   **Médio:** Escolha respostas conhecidas, mas talvez não as mais óbvias. Pode exigir um pouco mais de conhecimento específico.
        *   **Difícil:** Escolha respostas mais obscuras, de nicho, técnicas ou menos conhecidas dentro do tópico. Exigirá conhecimento especializado ou raciocínio dedutivo mais profundo.
    *   **Critério de Singularidade e Variedade:** **EXTREMAMENTE IMPORTANTE: EVITE RESPOSTAS MUITO COMUNS, CLICHÊS OU AS PRIMEIRAS QUE VÊM À MENTE.** O objetivo é ter uma GRANDE VARIEDADE de cartas ao longo de MÚLTIPLOS JOGOS. Mesmo no nível 'Fácil', tente encontrar alternativas menos óbvias. **Seja criativo e procure por respostas mais específicas ou de nicho dentro do tópico e dificuldade fornecidos.** Não repita respostas que você já possa ter dado em solicitações anteriores, mesmo que para dificuldades diferentes.
    *   **Exemplo de Pensamento (Tópico: Filmes, Dificuldade: Difícil):** Em vez de "O Poderoso Chefão" ou "Matrix", considere filmes cult como "Stalker (1979)", "Primer (2004)", um filme experimental específico, ou um filme estrangeiro menos conhecido no Brasil.
    *   **Exemplo de Pensamento (Tópico: Ciência, Dificuldade: Fácil):** "Gravidade" ou "Fotossíntese" são aceitáveis, mas considere também "Buraco Negro", "DNA", "Evolução", "Antibiótico". Varie!
    *   **Exemplo de Pensamento (Tópico: História, Dificuldade: Médio):** Em vez de "Revolução Francesa", talvez "Guerra dos Cem Anos" ou "A Rota da Seda".
2.  **Determine o Tipo da Resposta:** Classifique a resposta que você escolheu em uma categoria geral. Use um termo simples e direto como 'Pessoa', 'Lugar', 'Coisa', 'Evento', 'Conceito', 'Filme', 'Livro', 'Animal', 'Comida', 'Personagem Fictício', 'Obra de Arte', etc. Defina o campo 'answerType' com esta classificação.
3.  **Gere Dicas:** Crie **exatamente 20** dicas para a resposta.
    *   **Progressão de Dificuldade das Dicas:** As dicas DEVEM começar muito difíceis/obscuras (Dica 1) e progressivamente ficar mais fáceis. A Dica 20 deve tornar a resposta bastante óbvia, mas ainda exigir um mínimo de raciocínio. A dificuldade geral das dicas deve refletir a dificuldade **{{{difficulty}}}** selecionada (dicas mais obscuras no início para difícil, mais diretas no final para fácil).
    *   **Conteúdo da Dica:** As dicas devem ser factuais, interessantes e sugerir a resposta sem revelá-la muito cedo. Evite perguntas de sim/não ou dicas excessivamente diretas nas primeiras dicas, especialmente para dificuldades mais altas.
    *   **Clareza:** Cada dica deve ser uma frase única e clara.
4.  **Formate a Saída:** Estruture sua resposta como um objeto JSON correspondente ao esquema de saída. Use o UUID fornecido para o 'cardId'. Certifique-se de incluir o campo 'answerType' com a classificação determinada na Etapa 2 e garantir que existam **exatamente 20 dicas** no array 'clues'.

**Tópico de Entrada:** {{{topic}}}
**Dificuldade de Entrada:** {{{difficulty}}}
**Número de Dicas (Fixo):** 20
**ID da Carta:** {{{cardId}}}

**Exemplo (Tópico: Ciência, Dificuldade: Médio):**
Resposta: Tardígrado (Urso d'água)
Tipo da Resposta: Animal
Dica 1: Sou um organismo microscópico conhecido pela minha resistência extrema.
Dica 2: Posso entrar em um estado de criptobiose para sobreviver a condições ambientais adversas.
... (mais 16 dicas de dificuldade crescente)
Dica 19: Sou frequentemente comparado a um animal mamífero que hiberna.
Dica 20: Sou frequentemente chamado de 'urso d'água' devido à minha aparência segmentada e capacidade de sobreviver em ambientes aquáticos.

**Gere a carta agora, focando em uma resposta MENOS COMUM E MAIS VARIADA, adequada à dificuldade, incluindo o tipo da resposta e exatamente 20 dicas ordenadas.**
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
    // Validate the number of clues generated (now expects 20)
    const expectedNumClues = 20; // Hardcoded based on game rules
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
              output.clues.push("(Dica faltando gerada pelo sistema)");
          }
      }
      // Consider throwing an error or retrying if strict count is required
      // throw new Error(`A IA gerou ${output.clues.length} dicas, mas eram esperadas ${expectedNumClues}.`);
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
        // Use parse to ensure the final output matches the schema, including the clue count check
        const validatedOutput = GenerateCardOutputSchema.parse(output);
        return validatedOutput;
    } catch (validationError) {
        // Translated error
        console.error("Saída da IA falhou na validação:", validationError);
        console.error("Dados recebidos da IA:", output); // Log the problematic output
        throw new Error("A saída da IA não correspondeu ao formato esperado após a geração.");
    }
  }
);