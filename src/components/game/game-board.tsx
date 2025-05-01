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
import { Loader2, HelpCircle, Trophy, ChevronRight } from 'lucide-react';
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

export default function GameBoard() {
  const [gameStarted, setGameStarted] = useState(false);
  const [loadingCard, setLoadingCard] = useState(false);
  const [loadingClue, setLoadingClue] = useState(false);
  const [currentCard, setCurrentCard] = useState<GenerateCardOutput | null>(null);
  const [revealedClues, setRevealedClues] = useState<string[]>([]);
  const [currentClueIndex, setCurrentClueIndex] = useState(0);
  const [guess, setGuess] = useState('');
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [players, setPlayers] = useState<Player[]>([
    { id: 'player1', name: 'Player 1', score: 0 },
    { id: 'player2', name: 'Player 2', score: 0 },
  ]); // Example players
  const [gameOver, setGameOver] = useState(false);
  const { toast } = useToast();

  const handleStartGame = async () => {
    setLoadingCard(true);
    setGameOver(false);
    setPlayers(players.map(p => ({ ...p, score: 0 }))); // Reset scores
    try {
      const card = await generateCard({ topic: 'General Knowledge', numClues: NUM_CLUES });
      setCurrentCard(card);
      setRevealedClues([]);
      setCurrentClueIndex(0);
      setGuess('');
      setCurrentPlayerIndex(0);
      setGameStarted(true);
      // Reveal the first clue automatically
      revealNextClue(card.answer); // Pass answer to revealNextClue
    } catch (error) {
      console.error('Error generating card:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate a new card. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoadingCard(false);
    }
  };

  const revealNextClue = useCallback(async (cardAnswer: string) => { // Accept cardAnswer
    if (!currentCard || currentClueIndex >= NUM_CLUES || gameOver) return;

    setLoadingClue(true);
    try {
      // Use generated clues if available, otherwise call generateClues
      if (currentCard.clues && currentClueIndex < currentCard.clues.length) {
        const nextClue = currentCard.clues[currentClueIndex];
        setRevealedClues((prev) => [...prev, `${currentClueIndex + 1}. ${nextClue}`]);
        setCurrentClueIndex((prev) => prev + 1);
      } else {
        // Fallback to generateClues if pre-generated clues run out or don't exist
        const clueData: GenerateCluesOutput = await generateClues({
          cardName: cardAnswer, // Use the passed cardAnswer
          currentClueNumber: currentClueIndex + 1,
        });
        setRevealedClues((prev) => [...prev, `${currentClueIndex + 1}. ${clueData.clue}`]);
        setCurrentClueIndex((prev) => prev + 1);
      }
       // Check if it was the last clue
       if (currentClueIndex + 1 >= NUM_CLUES) {
        setGameOver(true);
        toast({
          title: 'Game Over',
          description: `No one guessed correctly! The answer was: ${cardAnswer}`,
          variant: 'destructive',
        });
       }

    } catch (error) {
      console.error('Error generating clue:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate the next clue.',
        variant: 'destructive',
      });
    } finally {
      setLoadingClue(false);
    }
  }, [currentCard, currentClueIndex, toast, gameOver]); // Add gameOver dependency


  const handleGuessSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!currentCard || !guess.trim() || gameOver) return;

    const correctAnswer = currentCard.answer.toLowerCase().trim();
    const playerGuess = guess.toLowerCase().trim();

    if (playerGuess === correctAnswer) {
      const pointsAwarded = POINTS_PER_CLUE[currentClueIndex -1]; // -1 because index is updated after reveal
      setPlayers((prevPlayers) =>
        prevPlayers.map((player, index) =>
          index === currentPlayerIndex ? { ...player, score: player.score + pointsAwarded } : player
        )
      );
      toast({
        title: 'Correct!',
        description: `${players[currentPlayerIndex].name} guessed correctly and earned ${pointsAwarded} points! The answer was: ${currentCard.answer}`,
        variant: 'default', // Use default for success
        className: 'bg-accent text-accent-foreground', // Green accent for correct guess
      });
      setGameOver(true); // End the round
      // Optionally: Start next round automatically or provide a button
      // handleStartGame(); // Example: Start next round immediately
    } else {
      toast({
        title: 'Incorrect Guess',
        description: 'Try again or reveal the next clue.',
        variant: 'destructive',
        className: 'animate-shake', // Add subtle shake animation
      });
      setGuess('');
      // Move to the next player
      setCurrentPlayerIndex((prevIndex) => (prevIndex + 1) % players.length);
       // If it cycles back to the first player, reveal the next clue
      if ((currentPlayerIndex + 1) % players.length === 0) {
         revealNextClue(currentCard.answer);
      }
    }
  };

  // Effect to reveal the first clue when a card is loaded
  useEffect(() => {
    if (currentCard && revealedClues.length === 0 && !loadingCard && gameStarted) {
     // revealNextClue(currentCard.answer); // Pass answer
    }
  }, [currentCard, revealedClues.length, loadingCard, gameStarted, revealNextClue]);


  // Subtle animation effect for incorrect guess
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
      <Card className="flex-1">
        <CardHeader>
          <CardTitle className="text-2xl text-primary">
            {gameStarted ? `Current Card (${POINTS_PER_CLUE[Math.max(0, currentClueIndex - 1)]} Points)` : 'Start Game'}
          </CardTitle>
          {gameStarted && currentCard && (
            <CardDescription>Topic: {currentCard.topic}</CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {!gameStarted ? (
            <div className="text-center">
              <p className="mb-4 text-muted-foreground">Click the button below to start a new game of Perfil!</p>
              <Button onClick={handleStartGame} disabled={loadingCard}>
                {loadingCard ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <HelpCircle className="mr-2 h-4 w-4" />}
                Generate New Card
              </Button>
            </div>
          ) : (
            <>
              <ScrollArea className="h-48 w-full rounded-md border p-4 bg-secondary">
                {revealedClues.length === 0 && !loadingClue && (
                  <p className="text-muted-foreground italic">No clues revealed yet.</p>
                )}
                {revealedClues.map((clue, index) => (
                  <p key={index} className="mb-2 text-foreground">{clue}</p>
                ))}
                {loadingClue && <Loader2 className="m-auto h-6 w-6 animate-spin text-primary" />}
              </ScrollArea>

              <Progress value={(currentClueIndex / NUM_CLUES) * 100} className="w-full h-2" />
              <p className="text-sm text-muted-foreground text-center">
                Clue {currentClueIndex} of {NUM_CLUES}
              </p>

              <form onSubmit={handleGuessSubmit} className="flex gap-2 items-center">
                <Input
                  type="text"
                  placeholder={`${players[currentPlayerIndex].name}, make your guess...`}
                  value={guess}
                  onChange={(e) => setGuess(e.target.value)}
                  disabled={loadingClue || gameOver}
                  className="flex-grow"
                />
                <Button type="submit" disabled={loadingClue || !guess.trim() || gameOver} variant="default">
                  Submit Guess
                </Button>
              </form>
            </>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          {gameStarted && (
              <Button
                onClick={() => currentCard && revealNextClue(currentCard.answer)}
                disabled={loadingClue || currentClueIndex >= NUM_CLUES || gameOver}
                variant="outline"
              >
                {loadingClue ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ChevronRight className="mr-2 h-4 w-4" />}
                Next Clue
              </Button>
          )}
           {gameOver && (
             <Button onClick={handleStartGame} disabled={loadingCard}>
                {loadingCard ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trophy className="mr-2 h-4 w-4" />}
                 Play Again
             </Button>
           )}
        </CardFooter>
      </Card>

      <PlayerScores players={players} currentPlayerId={players[currentPlayerIndex]?.id} />
    </div>
  );
}
