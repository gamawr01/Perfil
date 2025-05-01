/**
 * Normaliza uma resposta em string para comparação.
 * - Converte para minúsculas.
 * - Remove pontuações comuns (.,!?-').
 * - Remove espaços em branco no início e no fim.
 * - Substitui múltiplos espaços por um único espaço.
 * - Remove diacríticos (acentos).
 */
export function normalizeAnswer(answer: string): string {
  if (!answer) {
    return '';
  }

  return answer
    .toLowerCase() // Converte para minúsculas
    .normalize('NFD') // Decompõe caracteres acentuados
    .replace(/[\u0300-\u036f]/g, '') // Remove diacríticos (acentos)
    .replace(/[.,!?'"-]/g, '') // Remove pontuações comuns
    .replace(/\s+/g, ' ') // Substitui múltiplos espaços por um único espaço
    .trim(); // Remove espaços no início/fim
}


/**
 * Calcula a distância Levenshtein entre duas strings.
 * Representa o número mínimo de edições de um caractere (inserções, exclusões ou substituições)
 * necessárias para transformar uma string na outra.
 *
 * @param a A primeira string.
 * @param b A segunda string.
 * @returns A distância Levenshtein entre as duas strings.
 */
export function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];

  // Incrementa ao longo da primeira coluna de cada linha
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  // Incrementa ao longo da primeira linha de cada coluna
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  // Preenche o restante da matriz
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = a[j - 1] === b[i - 1] ? 0 : 1; // Custo é 0 se os caracteres forem iguais, 1 caso contrário

      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // Exclusão
        matrix[i][j - 1] + 1, // Inserção
        matrix[i - 1][j - 1] + cost // Substituição
      );
    }
  }

  return matrix[b.length][a.length];
}
