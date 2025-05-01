
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { generateCard } from '@/ai/flows/generate-card';
import { generateClues } from '@/ai/flows/generate-clues';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, HelpCircle, Trophy, ChevronRight, SkipForward, BarChart } from 'lucide-react'; // Added BarChart icon
import { PlayerScores } from './player-scores';
import { type GenerateCardOutput } from '@/ai/flows/generate-card';
import { type GenerateCluesOutput } from '@/ai/flows/generate-clues';
// Importa as funções de normalização e distância Levenshtein
import { normalizeAnswer, levenshteinDistance } from '@/lib/string-utils';

const POINTS_PER_CLUE = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
const NUM_CLUES = 10;
const MAX_GENERATION_ATTEMPTS = 5; // Limita as tentativas para gerar cartas únicas
// Limite de distância Levenshtein relativo ao comprimento da resposta correta (ex: 20% de diferença permitida)
const LEVENSHTEIN_THRESHOLD_RATIO = 0.2; // Permite cerca de 1 erro a cada 5 caracteres
const MIN_LEVENSHTEIN_THRESHOLD = 1; // Limite mínimo absoluto (permite pelo menos 1 erro mesmo em respostas curtas)

interface Player {
  id: string;
  name: string;
  score: number;
}

interface GameBoardProps {
  category: string;
  playerCount: number;
  difficulty: string; // Added difficulty prop
  onReturnToSetup: () => void; // Adiciona prop para lidar com o retorno à configuração
}

// Helper to format difficulty string
const formatDifficulty = (difficulty: string): string => {
    switch (difficulty) {
        case 'facil': return 'Fácil';
        case 'medio': return 'Médio';
        case 'dificil': return 'Difícil';
        default: return difficulty;
    }
};


export default function GameBoard({ category, playerCount, difficulty, onReturnToSetup }: GameBoardProps) {
  const [gameStarted, setGameStarted] = useState(false);
  const [loadingCard, setLoadingCard] = useState(false);
  const [loadingClue, setLoadingClue] = useState(false);
  const [currentCard, setCurrentCard] = useState<GenerateCardOutput | null>(null);
  const [revealedClues, setRevealedClues] = useState<string[]>([]);
  const [currentClueIndex, setCurrentClueIndex] = useState(0);
  const [guess, setGuess] = useState('');
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [players, setPlayers] = useState<Player[]>([]); // Inicializa como vazio
  const [gameOver, setGameOver] = useState(false); // Rastreia se a *rodada* atual terminou
  const [isSubmitting, setIsSubmitting] = useState(false); // Rastreia o estado de envio do palpite
  const [roundStartingPlayerIndex, setRoundStartingPlayerIndex] = useState(0); // Rastreia quem iniciou a rodada atual da carta
  const [generatedAnswers, setGeneratedAnswers] = useState<Set<string>>(new Set()); // Rastreia respostas geradas para evitar repetições
  const { toast } = useToast();

  // Função para gerar uma carta única
  const generateUniqueCard = useCallback(async (): Promise<GenerateCardOutput> => {
    let attempts = 0;
    while (attempts < MAX_GENERATION_ATTEMPTS) {
      attempts++;
      // Passa a categoria e dificuldade para a IA
      const card = await generateCard({ topic: category, numClues: NUM_CLUES, difficulty: difficulty });
      // Normaliza a resposta antes de verificar a unicidade
      const normalizedAnswer = normalizeAnswer(card.answer);
      if (!generatedAnswers.has(normalizedAnswer)) {
        setGeneratedAnswers((prev) => new Set(prev).add(normalizedAnswer));
        return card;
      }
      console.warn(`Carta duplicada gerada (tentativa ${attempts}): ${card.answer}`);
      toast({
        title: 'Carta Duplicada Detectada',
        description: `Tentando gerar uma carta única... (Tentativa ${attempts})`,
        variant: 'default',
      });
    }
    throw new Error(`Falha ao gerar uma carta única após ${MAX_GENERATION_ATTEMPTS} tentativas.`);
  }, [category, difficulty, generatedAnswers, toast]); // Dependências adicionadas (difficulty)

  // revealNextClue agora aceita os parâmetros necessários diretamente
  const revealNextClue = useCallback(async (cardAnswer: string | undefined, clueIdx: number, allClues: string[] | undefined) => {
    // Adiciona verificações para cardAnswer ser potencialmente indefinido
    if (!cardAnswer || clueIdx >= NUM_CLUES || gameOver || loadingClue) return;

    setLoadingClue(true);
    try {
      let nextClueText = '';
      // Usa dicas pré-geradas se disponíveis
      if (allClues && clueIdx < allClues.length) {
        nextClueText = allClues[clueIdx];
      } else {
        // Recorre à API generateClues se necessário (idealmente não deve acontecer se generateCard funcionar)
        console.warn("Recorrendo à API generateClues para a dica:", clueIdx + 1);
        const clueData: GenerateCluesOutput = await generateClues({
          cardName: cardAnswer, // cardAnswer é verificado como indefinido acima
          currentClueNumber: clueIdx + 1,
        });
        nextClueText = clueData.clue;
      }

      // Atualiza o estado *após* obter a dica com sucesso
      setRevealedClues((prev) => [...prev, `${clueIdx + 1}. ${nextClueText}`]);
      setCurrentClueIndex(clueIdx + 1); // Atualiza o índice para a próxima chamada

      // Verifica se esta foi a última dica *após* revelá-la
      if (clueIdx + 1 >= NUM_CLUES) {
        setGameOver(true);
        toast({
          title: 'Fim da Rodada',
          description: `Ninguém acertou! A resposta era: ${cardAnswer}`,
          variant: 'destructive',
        });
      }

    } catch (error) {
      console.error('Erro ao revelar dica:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao revelar a próxima dica.',
        variant: 'destructive',
      });
    } finally {
      setLoadingClue(false);
    }
  }, [toast, gameOver, loadingClue]); // Adicionada dependência loadingClue


   // Função para iniciar o primeiro jogo ou reiniciar completamente
   // Aceita initialPlayers de useEffect
   const handleStartGame = useCallback(async (initialPlayers: Player[]) => {
     if (loadingCard || initialPlayers.length === 0) return; // Verifica initialPlayers

     setLoadingCard(true);
     setGameOver(false);
     // Usa nomes padrão em português se necessário
     setPlayers(initialPlayers.map((p, i) => ({ ...p, name: `Jogador ${i + 1}`, score: 0 }))); // Redefine pontuações usando initialPlayers
     setGeneratedAnswers(new Set()); // Limpa respostas geradas para novo jogo
     setCurrentPlayerIndex(0); // Começa com o jogador 1
     setRoundStartingPlayerIndex(0); // Jogador 0 inicia o jogo/rodada
     try {
       // Usa a prop category aqui
       const card = await generateUniqueCard(); // Usa o gerador de cartas únicas
       setCurrentCard(card);
       setRevealedClues([]);
       setCurrentClueIndex(0);
       setGuess('');
       setGameStarted(true); // Define o jogo como iniciado
       // Revela a primeira dica depois que a carta é definida
       // Precisa verificar card e card.answer antes de chamar
       if (card?.answer) {
         revealNextClue(card.answer, 0, card.clues); // Passa as informações necessárias
       } else {
          throw new Error("A carta gerada não tem resposta.");
       }
     } catch (error) {
       console.error('Erro ao iniciar o jogo:', error);
       const errorMessage = error instanceof Error ? error.message : 'Ocorreu um erro desconhecido.';
       toast({
         title: 'Erro ao Iniciar Jogo',
         description: `Falha ao gerar a primeira carta: ${errorMessage}. Por favor, tente novamente.`,
         variant: 'destructive',
       });
       setGameStarted(false); // Garante que o jogo não pareça iniciado em caso de erro
       // Considere retornar à configuração ou mostrar um botão de tentar novamente
     } finally {
       setLoadingCard(false);
     }
   // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [category, difficulty, loadingCard, revealNextClue, toast, generateUniqueCard]); // Dependências para handleStartGame (added difficulty)


  // Inicializa jogadores com base na prop playerCount
  useEffect(() => {
    const initialPlayers = Array.from({ length: playerCount }, (_, i) => ({
      id: `player${i + 1}`,
      // Usa nome padrão em português aqui também
      name: `Jogador ${i + 1}`,
      score: 0,
    }));
    setPlayers(initialPlayers);
    // Inicia o jogo automaticamente assim que os jogadores são inicializados
    if (initialPlayers.length > 0 && !gameStarted) { // Só inicia se ainda não estiver iniciado
        handleStartGame(initialPlayers); // Passa os jogadores iniciais para iniciar o jogo
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerCount]); // Executa apenas quando playerCount muda (na montagem inicial)


  // Função para iniciar a próxima rodada (nova carta, próximo jogador)
  const handleNextRound = async () => {
    if (loadingCard || players.length === 0) return; // Evita múltiplos cliques e trata caso sem jogadores
    setLoadingCard(true);
    setGameOver(false); // Inicia a nova rodada

    // Determina o próximo jogador *antes* de buscar a carta
    const nextPlayerIndex = (roundStartingPlayerIndex + 1) % players.length; // Próxima rodada começa com o próximo jogador na sequência
    setCurrentPlayerIndex(nextPlayerIndex);
    setRoundStartingPlayerIndex(nextPlayerIndex); // Atualiza quem inicia esta nova rodada

    try {
      // Usa a prop category e difficulty aqui e gera carta única
      const card = await generateUniqueCard();
      setCurrentCard(card);
      setRevealedClues([]);
      setCurrentClueIndex(0);
      setGuess('');
       // Revela a primeira dica para a nova rodada
      // Precisa verificar card e card.answer antes de chamar
      if (card?.answer) {
         revealNextClue(card.answer, 0, card.clues);
      } else {
          throw new Error("A carta gerada não tem resposta.");
      }
    } catch (error) {
      console.error('Erro ao gerar próxima carta:', error);
      const errorMessage = error instanceof Error ? error.message : 'Ocorreu um erro desconhecido.';
      toast({
        title: 'Erro ao Gerar Carta',
        description: `Falha ao gerar a próxima carta: ${errorMessage}. Por favor, tente novamente.`,
        variant: 'destructive',
      });
       // Tentar continuar o jogo pode ser complexo, talvez apenas sinalizar erro
       setGameOver(true); // Define o jogo como encerrado novamente se a busca da carta falhar
    } finally {
      setLoadingCard(false);
    }
  };


  const handleGuessSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!currentCard || !guess.trim() || gameOver || isSubmitting || loadingClue || players.length === 0) return;

    setIsSubmitting(true); // Evita envio duplo

    // Normaliza tanto o palpite quanto a resposta correta
    const normalizedPlayerGuess = normalizeAnswer(guess);
    const normalizedCorrectAnswer = normalizeAnswer(currentCard.answer);

    // Calcula a distância Levenshtein
    const distance = levenshteinDistance(normalizedPlayerGuess, normalizedCorrectAnswer);

    // Calcula o limite de distância permitido com base no comprimento da resposta correta
    const threshold = Math.max(
        MIN_LEVENSHTEIN_THRESHOLD,
        Math.floor(normalizedCorrectAnswer.length * LEVENSHTEIN_THRESHOLD_RATIO)
    );

    const isCorrect = distance <= threshold; // Verifica se a distância está dentro do limite

    const currentPlayer = players[currentPlayerIndex]; // Garante que currentPlayerIndex é válido

    if (!currentPlayer) {
      console.error("Jogador atual indefinido");
      setIsSubmitting(false);
      return; // Sai se o jogador não existir
    }

    if (isCorrect) { // Usa a verificação de distância Levenshtein
      const pointsAwarded = POINTS_PER_CLUE[Math.max(0, currentClueIndex - 1)]; // Índice é 0-based para acesso ao array
      setPlayers((prevPlayers) =>
        prevPlayers.map((player) =>
          player.id === currentPlayer.id ? { ...player, score: player.score + pointsAwarded } : player
        )
      );
      toast({
        title: 'Correto!',
        // Exibe a resposta original no toast para clareza
        description: `${currentPlayer.name} acertou e ganhou ${pointsAwarded} pontos! A resposta era: ${currentCard.answer}`,
        variant: 'default',
        className: 'bg-accent text-accent-foreground',
      });
      setGameOver(true); // Encerra a rodada
    } else {
      toast({
        title: 'Palpite Incorreto',
        description: `Desculpe ${currentPlayer.name}, não é isso.`, // Simplified message
        // description: `Desculpe ${currentPlayer.name}, não é isso. Distância: ${distance}, Limite: ${threshold}`, // Opcional: mostra a distância/limite para depuração
        variant: 'destructive',
        className: 'animate-shake', // Mantém a animação de tremer
      });
      setGuess('');

      // Move para o próximo jogador *imediatamente* após o palpite incorreto
      const nextPlayerIndex = (currentPlayerIndex + 1) % players.length;
      setCurrentPlayerIndex(nextPlayerIndex);

       // Verifica se o turno voltou para o jogador que começou a adivinhar esta *dica*.
       // O jogador que começou a adivinhar na dica atual é o `roundStartingPlayerIndex` para a *rodada atual*.
       // Se o *próximo* jogador a jogar for aquele que iniciou a rodada, significa que todos tiveram uma chance na dica atual.
       if (nextPlayerIndex === roundStartingPlayerIndex && currentClueIndex < NUM_CLUES) {
         // Um ciclo completo de jogadores tentou a dica atual. Revele a próxima.
         // Garante que currentCard e suas propriedades são válidas antes de chamar
         if (currentCard?.answer && currentCard?.clues) {
            revealNextClue(currentCard.answer, currentClueIndex, currentCard.clues);
         } else {
            console.error("Não é possível revelar a próxima dica: Faltam dados da carta.");
            toast({ title: "Erro", description: "Não foi possível buscar os dados da próxima dica.", variant: "destructive" });
         }
       }
    }
    setIsSubmitting(false); // Reativa o envio
  };

  // Efeito para animação de tremer
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @keyframes shake {
        0%, 100% { transform: translateX(0); }
        10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
        20%, 40%, 60%, 80% { transform: translateX(5px); }
      }
      .animate-shake {
        animation: shake 0.5s ease-in-out;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);


  return (
    <div className="w-full max-w-4xl flex flex-col md:flex-row gap-8">
      <Card className="flex-1 flex flex-col">
        <CardHeader>
          <CardTitle className="text-2xl text-primary flex justify-between items-center">
            <span>
              {gameStarted && currentCard ? `Carta Atual (${POINTS_PER_CLUE[Math.max(0, currentClueIndex - 1)] ?? 0} Pontos)` : 'Carregando Jogo...'}
            </span>
             {gameStarted && !gameOver && players.length > 0 && (
               <span className="text-sm font-medium text-muted-foreground">
                 Jogador: {players[currentPlayerIndex]?.name ?? 'N/A'}
               </span>
             )}
          </CardTitle>
          {gameStarted && currentCard && (
            <CardDescription className="flex items-center gap-4"> {/* Use flex for horizontal layout */}
                <span>Tópico: {currentCard.topic} | Categoria: {category}</span>
                <span className="flex items-center gap-1"> {/* Flex for icon and text */}
                    <BarChart className="h-4 w-4" /> {/* Difficulty icon */}
                    Dificuldade: {formatDifficulty(difficulty)}
                </span>
            </CardDescription>
          )}
           {!gameStarted && !loadingCard && (
              <CardDescription>Configurando o jogo...</CardDescription>
           )}
           {loadingCard && !gameStarted && (
              <CardDescription>Gerando a primeira carta para {category} (Dificuldade: {formatDifficulty(difficulty)})...</CardDescription>
           )}
           {loadingCard && gameStarted && (
               <CardDescription>Gerando a próxima carta para {category} (Dificuldade: {formatDifficulty(difficulty)})...</CardDescription>
           )}
        </CardHeader>
        <CardContent className="space-y-4 flex-grow">
          {!gameStarted && !loadingCard ? ( // Mostra a configuração apenas se não iniciado E não carregando
             <div className="text-center flex flex-col items-center justify-center h-full min-h-[200px]">
               <p className="text-muted-foreground mb-4">Inicializando jogadores e preparando o tabuleiro...</p>
                <Button onClick={onReturnToSetup} variant="outline">
                    Voltar para Configuração
                </Button>
            </div>
          ) : loadingCard && !currentCard ? ( // Mostra o loader inicial apenas ao carregar a primeira carta
             <div className="text-center flex flex-col items-center justify-center h-full min-h-[200px]">
               <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
               <p className="text-muted-foreground">Gerando a primeira carta...</p>
             </div>
           ) : ( // Visão principal do jogo
            <>
              <ScrollArea className="h-48 w-full rounded-md border p-4 bg-secondary">
                {revealedClues.length === 0 && !loadingClue && !loadingCard && (
                  <p className="text-muted-foreground italic text-center py-4">Revelando primeira dica...</p>
                )}
                 {revealedClues.map((clue, index) => (
                  <p key={index} className="mb-2 text-foreground">{clue}</p>
                ))}
                {(loadingClue || (loadingCard && revealedClues.length === 0)) && ( // Mostra loader se carregando carta OU dica quando nenhuma dica mostrada
                  <div className="flex justify-center items-center h-full"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                )}
                 {loadingClue && revealedClues.length > 0 && (
                     <div className="flex justify-center items-center pt-2"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
                 )}
                {gameOver && currentCard && (
                  <p className="mt-4 font-bold text-center text-destructive">Resposta: {currentCard.answer}</p>
                )}
              </ScrollArea>

              <Progress value={(currentClueIndex / NUM_CLUES) * 100} className="w-full h-2" />
              <p className="text-sm text-muted-foreground text-center">
                Dica {Math.min(currentClueIndex, NUM_CLUES)} de {NUM_CLUES}
              </p>

              {!gameOver && players.length > 0 && currentCard && ( // Garante que a carta exista para o input
                <form onSubmit={handleGuessSubmit} className="flex gap-2 items-center">
                  <Input
                    type="text"
                    placeholder={`${players[currentPlayerIndex]?.name ?? 'Jogador Atual'}, faça seu palpite...`}
                    value={guess}
                    onChange={(e) => setGuess(e.target.value)}
                    disabled={loadingClue || gameOver || isSubmitting || loadingCard}
                    className="flex-grow"
                    aria-label="Campo de palpite"
                  />
                  <Button type="submit" disabled={loadingClue || !guess.trim() || gameOver || isSubmitting || loadingCard} variant="default">
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Enviar Palpite
                  </Button>
                </form>
              )}
               {/* Caso onde o jogo começou mas o array de jogadores está vazio (não deve acontecer com os padrões) */}
               {gameStarted && players.length === 0 && (
                 <p className="text-center text-destructive">Erro: Nenhum jogador encontrado.</p>
               )}
            </>
          )}
        </CardContent>
        <CardFooter className="flex flex-wrap justify-between items-center gap-2 pt-4"> {/* Adicionado flex-wrap e gap */}
           {/* Botão Voltar para Configuração */}
           <Button onClick={onReturnToSetup} variant="outline" size="sm">
              Voltar para Configuração
            </Button>

          {gameStarted && !gameOver && currentCard && ( // Garante que a carta exista para o botão de revelar
              <Button
                onClick={() => currentCard && revealNextClue(currentCard.answer, currentClueIndex, currentCard.clues)}
                disabled={loadingClue || currentClueIndex >= NUM_CLUES || gameOver || loadingCard}
                variant="outline"
              >
                {loadingClue ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ChevronRight className="mr-2 h-4 w-4" />}
                Revelar Próxima Dica ({POINTS_PER_CLUE[currentClueIndex] ?? 0} pts)
              </Button>
          )}
           {gameStarted && gameOver && players.length > 0 && (
             // Usa handleNextRound atualizado
             <Button onClick={handleNextRound} disabled={loadingCard}>
                {loadingCard ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <SkipForward className="mr-2 h-4 w-4" />}
                 {/* Mostra quem começa a PRÓXIMA rodada */}
                 Próxima Carta (Vez de {players[(roundStartingPlayerIndex) % players.length]?.name ?? 'Próximo Jogador'})
             </Button>
           )}

        </CardFooter>
      </Card>

      {/* Garante que currentPlayerId seja passado corretamente, mesmo se o array de jogadores estiver vazio */}
      {/* Passa o array de jogadores para PlayerScores */}
      <PlayerScores players={players} currentPlayerId={gameStarted && !gameOver && players.length > 0 ? players[currentPlayerIndex]?.id : undefined} />
    </div>
  );
}

