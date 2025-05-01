
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
import { Loader2, HelpCircle, Trophy, ChevronRight, SkipForward, BarChart, Tag, Info } from 'lucide-react';
import { PlayerScores } from './player-scores';
import { type GenerateCardOutput } from '@/ai/flows/generate-card';
import { type GenerateCluesOutput } from '@/ai/flows/generate-clues';
import { normalizeAnswer, levenshteinDistance } from '@/lib/string-utils';
import { v4 as uuidv4 } from 'uuid'; // Import uuid for unique player IDs

const POINTS_PER_CLUE = [
    20, 19, 18, 17, 16, 15, 14, 13, 12, 11,
    10, 9, 8, 7, 6, 5, 4, 3, 2, 1
];
const NUM_CLUES = 20;
const MAX_GENERATION_ATTEMPTS = 5;
const LEVENSHTEIN_THRESHOLD_RATIO = 0.2;
const MIN_LEVENSHTEIN_THRESHOLD = 1;
const LEVENSHTEIN_CLOSE_THRESHOLD_RATIO = 0.35;
const MIN_LEVENSHTEIN_CLOSE_THRESHOLD_ADDITION = 1;

interface Player {
  id: string;
  name: string;
  score: number;
}

interface GameBoardProps {
  category: string;
  playerNames: string[]; // Changed from playerCount to playerNames
  difficulty: string;
  onReturnToSetup: () => void;
}

const formatDifficulty = (difficulty: string): string => {
    switch (difficulty) {
        case 'facil': return 'Fácil';
        case 'medio': return 'Médio';
        case 'dificil': return 'Difícil';
        default: return difficulty;
    }
};

export default function GameBoard({ category, playerNames, difficulty, onReturnToSetup }: GameBoardProps) {
  const [gameStarted, setGameStarted] = useState(false);
  const [loadingCard, setLoadingCard] = useState(false);
  const [loadingClue, setLoadingClue] = useState(false);
  const [currentCard, setCurrentCard] = useState<GenerateCardOutput | null>(null);
  const [revealedClues, setRevealedClues] = useState<string[]>([]);
  const [currentClueIndex, setCurrentClueIndex] = useState(0);
  const [guess, setGuess] = useState('');
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [players, setPlayers] = useState<Player[]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [roundStartingPlayerIndex, setRoundStartingPlayerIndex] = useState(0);
  const [generatedAnswers, setGeneratedAnswers] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const generateUniqueCard = useCallback(async (): Promise<GenerateCardOutput> => {
    let attempts = 0;
    while (attempts < MAX_GENERATION_ATTEMPTS) {
      attempts++;
      const card = await generateCard({ topic: category, numClues: NUM_CLUES, difficulty: difficulty });
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
  }, [category, difficulty, generatedAnswers, toast]);

  const revealNextClue = useCallback(async (cardAnswer: string | undefined, clueIdx: number, allClues: string[] | undefined) => {
    if (!cardAnswer || clueIdx >= NUM_CLUES || gameOver || loadingClue) return;

    setLoadingClue(true);
    try {
      let nextClueText = '';
      if (allClues && clueIdx < allClues.length) {
        nextClueText = allClues[clueIdx];
      } else {
        console.warn("Recorrendo à API generateClues para a dica:", clueIdx + 1);
        const clueData: GenerateCluesOutput = await generateClues({
          cardName: cardAnswer,
          currentClueNumber: clueIdx + 1,
        });
        nextClueText = clueData.clue;
      }

      setRevealedClues((prev) => [...prev, `${clueIdx + 1}. ${nextClueText}`]);
      setCurrentClueIndex(clueIdx + 1);

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
  }, [toast, gameOver, loadingClue]);

   const handleStartGame = useCallback(async (initialPlayers: Player[]) => {
     if (loadingCard || initialPlayers.length === 0) return;

     setLoadingCard(true);
     setGameOver(false);
     // Set players directly from initialPlayers, no renaming needed
     setPlayers(initialPlayers.map(p => ({ ...p, score: 0 }))); // Reset scores
     setGeneratedAnswers(new Set());
     setCurrentPlayerIndex(0);
     setRoundStartingPlayerIndex(0);
     try {
       const card = await generateUniqueCard();
       setCurrentCard(card);
       setRevealedClues([]);
       setCurrentClueIndex(0);
       setGuess('');
       setGameStarted(true);
       if (card?.answer) {
         revealNextClue(card.answer, 0, card.clues);
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
       setGameStarted(false);
     } finally {
       setLoadingCard(false);
     }
   // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [category, difficulty, loadingCard, revealNextClue, toast, generateUniqueCard]);


  // Initialize players based on the playerNames prop
  useEffect(() => {
    // Generate player objects from names, ensuring unique IDs
    const initialPlayers = playerNames.map((name, i) => ({
      id: uuidv4(), // Use uuid for unique IDs
      name: name.trim() || `Jogador ${i + 1}`, // Use provided name or default
      score: 0,
    }));
    setPlayers(initialPlayers); // Set the initial player list

    // Start the game automatically if players are ready and game hasn't started
    if (initialPlayers.length > 0 && !gameStarted && !loadingCard) {
      handleStartGame(initialPlayers);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerNames]); // Dependency on playerNames ensures this runs when names change (e.g., on initial load)


  const handleNextRound = async () => {
    if (loadingCard || players.length === 0) return;
    setLoadingCard(true);
    setGameOver(false);

    const nextPlayerIndex = (roundStartingPlayerIndex + 1) % players.length;
    setCurrentPlayerIndex(nextPlayerIndex);
    setRoundStartingPlayerIndex(nextPlayerIndex);

    try {
      const card = await generateUniqueCard();
      setCurrentCard(card);
      setRevealedClues([]);
      setCurrentClueIndex(0);
      setGuess('');
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
       setGameOver(true);
    } finally {
      setLoadingCard(false);
    }
  };


  const handleGuessSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!currentCard || !guess.trim() || gameOver || isSubmitting || loadingClue || players.length === 0) return;

    setIsSubmitting(true);

    const normalizedPlayerGuess = normalizeAnswer(guess);
    const normalizedCorrectAnswer = normalizeAnswer(currentCard.answer);

    const distance = levenshteinDistance(normalizedPlayerGuess, normalizedCorrectAnswer);

    const correctnessThreshold = Math.max(
        MIN_LEVENSHTEIN_THRESHOLD,
        Math.floor(normalizedCorrectAnswer.length * LEVENSHTEIN_THRESHOLD_RATIO)
    );

    const closeThreshold = Math.max(
      correctnessThreshold + MIN_LEVENSHTEIN_CLOSE_THRESHOLD_ADDITION,
      Math.floor(normalizedCorrectAnswer.length * LEVENSHTEIN_CLOSE_THRESHOLD_RATIO)
    );

    const isCorrect = distance <= correctnessThreshold;
    const isClose = !isCorrect && distance <= closeThreshold;

    const currentPlayer = players[currentPlayerIndex];

    if (!currentPlayer) {
      console.error("Jogador atual indefinido");
      setIsSubmitting(false);
      return;
    }

    let incorrectGuess = false;

    if (isCorrect) {
      const pointsAwarded = POINTS_PER_CLUE[Math.max(0, currentClueIndex - 1)];
      setPlayers((prevPlayers) =>
        prevPlayers.map((player) =>
          player.id === currentPlayer.id ? { ...player, score: player.score + pointsAwarded } : player
        )
      );
      toast({
        title: 'Correto!',
        description: `${currentPlayer.name} acertou e ganhou ${pointsAwarded} pontos! A resposta era: ${currentCard.answer}`,
        variant: 'default',
        className: 'bg-accent text-accent-foreground',
      });
      setGameOver(true);
    } else if (isClose) {
        toast({
            title: 'Quase lá!',
            description: `Desculpe ${currentPlayer.name}, não é exatamente isso, mas você está perto!`,
            variant: 'default',
            className: 'bg-yellow-100 border-yellow-300 text-yellow-800 dark:bg-yellow-900 dark:border-yellow-700 dark:text-yellow-300',
        });
        incorrectGuess = true;
    } else {
      toast({
        title: 'Palpite Incorreto',
        description: `Desculpe ${currentPlayer.name}, não é isso.`,
        variant: 'destructive',
        className: 'animate-shake',
      });
      incorrectGuess = true;
    }

    if (incorrectGuess) {
      setGuess('');

      const nextPlayerIndex = (currentPlayerIndex + 1) % players.length;
      setCurrentPlayerIndex(nextPlayerIndex);

       if (nextPlayerIndex === roundStartingPlayerIndex && currentClueIndex < NUM_CLUES) {
         if (currentCard?.answer && currentCard?.clues) {
            revealNextClue(currentCard.answer, currentClueIndex, currentCard.clues);
         } else {
            console.error("Não é possível revelar a próxima dica: Faltam dados da carta.");
            toast({ title: "Erro", description: "Não foi possível buscar os dados da próxima dica.", variant: "destructive" });
         }
       }
    }

    setIsSubmitting(false);
  };

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
              {gameStarted && currentCard ? `Carta Atual (${POINTS_PER_CLUE[currentClueIndex] ?? 0} Pontos)` : 'Carregando Jogo...'}
            </span>
             {gameStarted && !gameOver && players.length > 0 && (
               <span className="text-sm font-medium text-muted-foreground">
                 Jogador: {players[currentPlayerIndex]?.name ?? 'N/A'}
               </span>
             )}
          </CardTitle>
          {gameStarted && currentCard && (
            <CardDescription className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                <span>Tópico: {currentCard.topic}</span>
                <span className="flex items-center gap-1">
                    <Tag className="h-4 w-4" />
                    Tipo: {currentCard.answerType || 'Desconhecido'}
                </span>
                <span className="flex items-center gap-1">
                    <BarChart className="h-4 w-4" />
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
          {!gameStarted && !loadingCard ? (
             <div className="text-center flex flex-col items-center justify-center h-full min-h-[200px]">
               <p className="text-muted-foreground mb-4">Inicializando jogadores e preparando o tabuleiro...</p>
                <Button onClick={onReturnToSetup} variant="outline">
                    Voltar para Configuração
                </Button>
            </div>
          ) : loadingCard && !currentCard ? (
             <div className="text-center flex flex-col items-center justify-center h-full min-h-[200px]">
               <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
               <p className="text-muted-foreground">Gerando a primeira carta...</p>
             </div>
           ) : (
            <>
              <ScrollArea className="h-72 w-full rounded-md border p-4 bg-secondary">
                {revealedClues.length === 0 && !loadingClue && !loadingCard && (
                  <p className="text-muted-foreground italic text-center py-4">Revelando primeira dica...</p>
                )}
                 {revealedClues.map((clue, index) => (
                  <p key={index} className="mb-2 text-foreground">{clue}</p>
                ))}
                {(loadingClue || (loadingCard && revealedClues.length === 0)) && (
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

              {!gameOver && players.length > 0 && currentCard && (
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
               {gameStarted && players.length === 0 && (
                 <p className="text-center text-destructive">Erro: Nenhum jogador encontrado.</p>
               )}
            </>
          )}
        </CardContent>
        <CardFooter className="flex flex-wrap justify-between items-center gap-2 pt-4">
           <Button onClick={onReturnToSetup} variant="outline" size="sm">
              Voltar para Configuração
            </Button>

          {gameStarted && !gameOver && currentCard && (
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
             <Button onClick={handleNextRound} disabled={loadingCard}>
                {loadingCard ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <SkipForward className="mr-2 h-4 w-4" />}
                 Próxima Carta (Vez de {players[(roundStartingPlayerIndex) % players.length]?.name ?? 'Próximo Jogador'})
             </Button>
           )}

        </CardFooter>
      </Card>

      {/* Pass the updated players array and currentPlayerId */}
      <PlayerScores players={players} currentPlayerId={gameStarted && !gameOver && players.length > 0 ? players[currentPlayerIndex]?.id : undefined} />
    </div>
  );
}
