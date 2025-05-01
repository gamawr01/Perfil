'use server';
/**
 * @fileOverview Valida se uma categoria personalizada é adequada para o jogo Perfil Online.
 *
 * - validateCategory - Função que valida a categoria.
 * - ValidateCategoryInput - O tipo de entrada para a função validateCategory.
 * - ValidateCategoryOutput - O tipo de retorno para a função validateCategory.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const ValidateCategoryInputSchema = z.object({
  category: z.string().describe('A categoria personalizada a ser validada.'),
});
export type ValidateCategoryInput = z.infer<typeof ValidateCategoryInputSchema>;

const ValidateCategoryOutputSchema = z.object({
  isValid: z.boolean().describe('Indica se a categoria é válida para o jogo.'),
  reason: z.string().optional().describe('O motivo pelo qual a categoria não é válida (se aplicável).'),
});
export type ValidateCategoryOutput = z.infer<typeof ValidateCategoryOutputSchema>;

export async function validateCategory(input: ValidateCategoryInput): Promise<ValidateCategoryOutput> {
  return validateCategoryFlow(input);
}

const validateCategoryPrompt = ai.definePrompt({
  name: 'validateCategoryPrompt',
  input: {
    schema: ValidateCategoryInputSchema,
  },
  output: {
    schema: ValidateCategoryOutputSchema,
  },
  prompt: `Você é um assistente de configuração para o jogo de adivinhação "Perfil Online".
Sua tarefa é avaliar se a categoria fornecida pelo usuário é adequada para o jogo.

**Critérios de Avaliação:**
1.  **Abrangência:** A categoria deve ser ampla o suficiente para conter várias respostas possíveis (pessoas, lugares, coisas, eventos, conceitos, etc.). Categorias excessivamente específicas ou de nicho podem não funcionar bem.
2.  **Adivinhabilidade:** Deve ser possível criar dicas de dificuldade progressiva para as respostas dentro da categoria. Categorias muito abstratas ou subjetivas podem ser difíceis de adivinhar.
3.  **Generalidade:** A categoria deve ser relativamente conhecida ou compreensível por um público geral. Evite jargões muito técnicos ou tópicos extremamente obscuros, a menos que a dificuldade seja definida como 'difícil'.
4.  **Evitar Ambiguidade:** A categoria deve ser clara e não excessivamente ambígua.

**Categoria para Avaliar:** {{{category}}}

**Instruções:**
- Analise a categoria fornecida com base nos critérios acima.
- Determine se a categoria é válida para o jogo ('isValid: true') ou não ('isValid: false').
- Se a categoria NÃO for válida, forneça um motivo claro e conciso em 'reason' explicando por que ela não é adequada (ex: "Muito específico", "Muito abstrato", "Difícil criar dicas").
- Se a categoria for válida, o campo 'reason' pode ser omitido ou vazio.

**Exemplos de Avaliação:**
- Categoria: "Mamíferos Aquáticos" -> { isValid: true } (É um bom nicho, mas possível)
- Categoria: "Coisas que me deixam feliz" -> { isValid: false, reason: "Muito subjetivo e pessoal." }
- Categoria: "Filmes de Christopher Nolan" -> { isValid: true }
- Categoria: "Parafusos específicos da minha gaveta" -> { isValid: false, reason: "Muito específico e impossível de adivinhar." }
- Categoria: "História do Brasil Colonial" -> { isValid: true }
- Categoria: "Sentimentos" -> { isValid: false, reason: "Muito abstrato, difícil criar dicas factuais." }

**Avalie a categoria "{{{category}}}" e retorne o resultado no formato JSON especificado.**
`,
});

const validateCategoryFlow = ai.defineFlow<
  typeof ValidateCategoryInputSchema,
  typeof ValidateCategoryOutputSchema
>(
  {
    name: 'validateCategoryFlow',
    inputSchema: ValidateCategoryInputSchema,
    outputSchema: ValidateCategoryOutputSchema,
  },
  async input => {
    // Basic pre-validation (optional)
    if (!input.category || input.category.trim().length < 3) {
      return { isValid: false, reason: 'A categoria precisa ter pelo menos 3 caracteres.' };
    }

    const {output} = await validateCategoryPrompt(input);

    if (!output) {
        throw new Error("IA falhou ao validar a categoria.");
    }

    return output;
  }
);
