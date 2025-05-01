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
