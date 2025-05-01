
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
import { Loader2, HelpCircle, Trophy, ChevronRight, SkipForward } from 'lucide-react';
import { PlayerScores } from './player-scores';
import { type GenerateCardOutput } from '@/ai/flows/generate-card';
import { type GenerateCluesOutput } from '@/ai/flows/generate-clues';

const POINTS_PER_CLUE = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
const NUM_CLUES = 10;

interface Player {
  id: string;
  name: string;
  score: number;
}

interface GameBoardProps {
  category: string;
  playerCount: number;
}

export default function GameBoard({ category, playerCount }: GameBoardProps) {
  const [gameStarted, setGameStarted] = useState(false);
  const [loadingCard, setLoadingCard] = useState(false);
  const [loadingClue, setLoadingClue] = useState(false);
  const [currentCard, setCurrentCard] = useState<GenerateCardOutput | null>(null);
  const [revealedClues, setRevealedClues] = useState<string[]>([]);
  const [currentClueIndex, setCurrentClueIndex] = useState(0);
  const [guess, setGuess] = useState('');
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [players, setPlayers] = useState<Player[]>([]); // Initialize as empty
  const [gameOver, setGameOver] = useState(false); // Tracks if the current *round* is over
  const [isSubmitting, setIsSubmitting] = useState(false); // Track guess submission state
  const [roundStartingPlayerIndex, setRoundStartingPlayerIndex] = useState(0); // Track who started the current card round
  const { toast } = useToast();

  // Initialize players based on playerCount prop
  useEffect(() => {
    const initialPlayers = Array.from({ length: playerCount }, (_, i) => ({
      id: `player${i + 1}`,
      name: `Player ${i + 1}`,
      score: 0,
    }));
    setPlayers(initialPlayers);
    // Automatically start the game once players are initialized
    if (initialPlayers.length > 0) {
      handleStartGame(initialPlayers); // Pass initial players to start game
    }
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerCount]); // Run only when playerCount changes (on initial mount)


  // revealNextClue now accepts necessary parameters directly
  const revealNextClue = useCallback(async (cardAnswer: string | undefined, clueIdx: number, allClues: string[] | undefined) => {
    // Add checks for cardAnswer being potentially undefined
    if (!cardAnswer || clueIdx >= NUM_CLUES || gameOver || loadingClue) return;

    setLoadingClue(true);
    try {
      let nextClueText = '';
      // Use pre-generated clues if available
      if (allClues && clueIdx < allClues.length) {
        nextClueText = allClues[clueIdx];
      } else {
        // Fallback to generateClues API if needed (should ideally not happen if generateCard works)
        console.warn("Falling back to generateClues API for clue:", clueIdx + 1);
        const clueData: GenerateCluesOutput = await generateClues({
          cardName: cardAnswer, // cardAnswer is checked for undefined above
          currentClueNumber: clueIdx + 1,
        });
        nextClueText = clueData.clue;
      }

      // Update state *after* successfully getting the clue
      setRevealedClues((prev) => [...prev, `${clueIdx + 1}. ${nextClueText}`]);
      setCurrentClueIndex(clueIdx + 1); // Update index for next call

      // Check if this was the last clue *after* revealing it
      if (clueIdx + 1 >= NUM_CLUES) {
        setGameOver(true);
        toast({
          title: 'Round Over',
          description: `No one guessed correctly! The answer was: ${cardAnswer}`,
          variant: 'destructive',
        });
      }

    } catch (error) {
      console.error('Error revealing clue:', error);
      toast({
        title: 'Error',
        description: 'Failed to reveal the next clue.',
        variant: 'destructive',
      });
    } finally {
      setLoadingClue(false);
    }
  }, [toast, gameOver, loadingClue]); // Added loadingClue dependency

  // Function to start the very first game or restart entirely
  // Accepts initialPlayers from useEffect
  const handleStartGame = useCallback(async (initialPlayers: Player[]) => {
    if (loadingCard || initialPlayers.length === 0) return; // Check against initialPlayers

    setLoadingCard(true);
    setGameOver(false);
    setPlayers(initialPlayers.map(p => ({ ...p, score: 0 }))); // Reset scores for a new game using initialPlayers
    setCurrentPlayerIndex(0); // Start with player 1
    setRoundStartingPlayerIndex(0); // Player 0 starts the game/round
    try {
      // Use the category prop here
      const card = await generateCard({ topic: category, numClues: NUM_CLUES });
      setCurrentCard(card);
      setRevealedClues([]);
      setCurrentClueIndex(0);
      setGuess('');
      setGameStarted(true); // Set game as started
      // Reveal the first clue after card is set
      // Need to check card and card.answer before calling
      if (card?.answer) {
        revealNextClue(card.answer, 0, card.clues); // Pass necessary info
      } else {
         throw new Error("Generated card is missing answer.");
      }
    } catch (error) {
      console.error('Error starting game:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate the first card. Please try again.',
        variant: 'destructive',
      });
      setGameStarted(false); // Ensure game doesn't appear started on error
    } finally {
      setLoadingCard(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, loadingCard, revealNextClue, toast]); // Dependencies for handleStartGame


  // Function to start the next round (new card, next player)
  const handleNextRound = async () => {
    if (loadingCard || players.length === 0) return; // Prevent multiple clicks and handle no players case
    setLoadingCard(true);
    setGameOver(false); // Start the new round

    // Determine next player *before* fetching card
    const nextPlayerIndex = (roundStartingPlayerIndex + 1) % players.length; // Next round starts with the next player in sequence
    setCurrentPlayerIndex(nextPlayerIndex);
    setRoundStartingPlayerIndex(nextPlayerIndex); // Update who starts this new round

    try {
      // Use the category prop here
      const card = await generateCard({ topic: category, numClues: NUM_CLUES });
      setCurrentCard(card);
      setRevealedClues([]);
      setCurrentClueIndex(0);
      setGuess('');
       // Reveal the first clue for the new round
      // Need to check card and card.answer before calling
      if (card?.answer) {
         revealNextClue(card.answer, 0, card.clues);
      } else {
          throw new Error("Generated card is missing answer.");
      }
    } catch (error) {
      console.error('Error generating next card:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate the next card. Please try again.',
        variant: 'destructive',
      });
       // Attempt to keep the game going might be complex, maybe just signal error
       setGameOver(true); // Re-set game over if card fetch fails
    } finally {
      setLoadingCard(false);
    }
  };


  const handleGuessSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!currentCard || !guess.trim() || gameOver || isSubmitting || loadingClue || players.length === 0) return;

    setIsSubmitting(true); // Prevent double submission

    const correctAnswer = currentCard.answer.toLowerCase().trim();
    const playerGuess = guess.toLowerCase().trim();
    const currentPlayer = players[currentPlayerIndex]; // Ensure currentPlayerIndex is valid

    if (!currentPlayer) {
      console.error("Current player is undefined");
      setIsSubmitting(false);
      return; // Exit if player doesn't exist
    }

    if (playerGuess === correctAnswer) {
      const pointsAwarded = POINTS_PER_CLUE[Math.max(0, currentClueIndex - 1)]; // Index is 0-based for array access
      setPlayers((prevPlayers) =>
        prevPlayers.map((player) =>
          player.id === currentPlayer.id ? { ...player, score: player.score + pointsAwarded } : player
        )
      );
      toast({
        title: 'Correct!',
        description: `${currentPlayer.name} guessed correctly and earned ${pointsAwarded} points! The answer was: ${currentCard.answer}`,
        variant: 'default',
        className: 'bg-accent text-accent-foreground',
      });
      setGameOver(true); // End the round
    } else {
      toast({
        title: 'Incorrect Guess',
        description: `Sorry ${currentPlayer.name}, that's not it.`,
        variant: 'destructive',
        className: 'animate-shake', // Keep the shake animation
      });
      setGuess('');

      // Move to the next player *immediately* after incorrect guess
      const nextPlayerIndex = (currentPlayerIndex + 1) % players.length;
      setCurrentPlayerIndex(nextPlayerIndex);

       // Check if the turn has cycled back to the player who started the guessing for this *clue*.
       // The player who started guessing on the current clue is the `roundStartingPlayerIndex` for the *current round*.
       // If the *next* player to play is the one who started the round, it means everyone has had a chance on the current clue.
       if (nextPlayerIndex === roundStartingPlayerIndex && currentClueIndex < NUM_CLUES) {
         // A full cycle of players attempted the current clue. Reveal the next one.
         revealNextClue(currentCard.answer, currentClueIndex, currentCard.clues);
       }
    }
    setIsSubmitting(false); // Re-enable submission
  };

  // Effect for shake animation
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
              {gameStarted && currentCard ? `Current Card (${POINTS_PER_CLUE[Math.max(0, currentClueIndex - 1)] ?? 0} Points)` : 'Loading Game...'}
            </span>
             {gameStarted && !gameOver && players.length > 0 && (
               <span className="text-sm font-medium text-muted-foreground">
                 Player: {players[currentPlayerIndex]?.name ?? 'N/A'}
               </span>
             )}
          </CardTitle>
          {gameStarted && currentCard && (
            <CardDescription>Topic: {currentCard.topic} | Category: {category}</CardDescription>
          )}
           {!gameStarted && !loadingCard && (
              <CardDescription>Setting up the game...</CardDescription>
           )}
           {loadingCard && !gameStarted && (
              <CardDescription>Generating the first card for {category}...</CardDescription>
           )}
        </CardHeader>
        <CardContent className="space-y-4 flex-grow">
          {!gameStarted ? (
            <div className="text-center flex flex-col items-center justify-center h-full min-h-[200px]">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Preparing the game board...</p>
              {/* Removed Start Game Button as it's handled by initialization */}
            </div>
          ) : (
            <>
              <ScrollArea className="h-48 w-full rounded-md border p-4 bg-secondary">
                {revealedClues.length === 0 && !loadingClue && !loadingCard && (
                  <p className="text-muted-foreground italic text-center py-4">Revealing first clue...</p>
                )}
                 {revealedClues.map((clue, index) => (
                  <p key={index} className="mb-2 text-foreground">{clue}</p>
                ))}
                {(loadingClue || (loadingCard && revealedClues.length === 0)) && ( // Show loader if loading card OR clue when no clues shown
                  <div className="flex justify-center items-center h-full"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                )}
                 {loadingClue && revealedClues.length > 0 && (
                     <div className="flex justify-center items-center pt-2"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
                 )}
                {gameOver && currentCard && (
                  <p className="mt-4 font-bold text-center text-destructive">Answer: {currentCard.answer}</p>
                )}
              </ScrollArea>

              <Progress value={(currentClueIndex / NUM_CLUES) * 100} className="w-full h-2" />
              <p className="text-sm text-muted-foreground text-center">
                Clue {Math.min(currentClueIndex, NUM_CLUES)} of {NUM_CLUES}
              </p>

              {!gameOver && players.length > 0 && (
                <form onSubmit={handleGuessSubmit} className="flex gap-2 items-center">
                  <Input
                    type="text"
                    placeholder={`${players[currentPlayerIndex]?.name ?? 'Current Player'}, make your guess...`}
                    value={guess}
                    onChange={(e) => setGuess(e.target.value)}
                    disabled={loadingClue || gameOver || isSubmitting || loadingCard}
                    className="flex-grow"
                    aria-label="Guess input"
                  />
                  <Button type="submit" disabled={loadingClue || !guess.trim() || gameOver || isSubmitting || loadingCard} variant="default">
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Submit Guess
                  </Button>
                </form>
              )}
               {/* Case where game started but players array is empty (should not happen with defaults) */}
               {gameStarted && players.length === 0 && (
                 <p className="text-center text-destructive">Error: No players found.</p>
               )}
            </>
          )}
        </CardContent>
        <CardFooter className="flex flex-wrap justify-between items-center gap-2 pt-4"> {/* Added flex-wrap and gap */}
          {gameStarted && !gameOver && (
              <Button
                onClick={() => currentCard && revealNextClue(currentCard.answer, currentClueIndex, currentCard.clues)}
                disabled={loadingClue || currentClueIndex >= NUM_CLUES || gameOver || loadingCard}
                variant="outline"
              >
                {loadingClue ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ChevronRight className="mr-2 h-4 w-4" />}
                Reveal Next Clue ({POINTS_PER_CLUE[currentClueIndex] ?? 0} pts)
              </Button>
          )}
           {gameStarted && gameOver && players.length > 0 && (
             // Use updated handleNextRound
             <Button onClick={handleNextRound} disabled={loadingCard}>
                {loadingCard ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <SkipForward className="mr-2 h-4 w-4" />}
                 Next Card ({players[(roundStartingPlayerIndex) % players.length]?.name ?? 'Next Player'}'s Turn) {/* Show who starts NEXT round */}
             </Button>
           )}
            {/* Removed the "Play Again" button, as restarting involves going back to setup */}
            {/* If a full game restart is needed here, uncomment and potentially add a function to reset to GameSetup */}
           {/* {(gameOver || !gameStarted) && (
             <Button onClick={() => handleStartGame(players)} disabled={loadingCard}> // Needs adjustment if restarting requires setup
                {loadingCard ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <HelpCircle className="mr-2 h-4 w-4" />}
                {gameStarted ? 'Play Again (New Game)' : 'Start New Game'}
             </Button>
           )} */}
        </CardFooter>
      </Card>

      {/* Ensure currentPlayerId is passed correctly, even if players array is empty */}
      <PlayerScores players={players} currentPlayerId={gameStarted && !gameOver && players.length > 0 ? players[currentPlayerIndex]?.id : undefined} />
    </div>
  );
}
