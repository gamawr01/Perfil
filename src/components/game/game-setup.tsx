
'use client';

import React, { useState } from 'react';
import GameBoard from '@/components/game/game-board';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, Play, BarChart } from 'lucide-react'; // Added BarChart for difficulty icon

// Translated Categories
const CATEGORIES = ['Conhecimentos Gerais', 'Filmes', 'História', 'Ciência', 'Esportes', 'Tecnologia', 'Geografia'];
const PLAYER_COUNTS = [1, 2, 3, 4];
const DIFFICULTIES = [
    { value: 'facil', label: 'Fácil' },
    { value: 'medio', label: 'Médio' },
    { value: 'dificil', label: 'Difícil' },
];

export default function GameSetup() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedPlayerCount, setSelectedPlayerCount] = useState<number | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(null); // Added state for difficulty
  const [isGameStarted, setIsGameStarted] = useState(false);

  const handleStartGame = () => {
    if (selectedCategory && selectedPlayerCount !== null && selectedDifficulty !== null) { // Added check for difficulty
      setIsGameStarted(true);
    }
  };

  // Handler to return to the setup screen
  const handleReturnToSetup = () => {
    setIsGameStarted(false);
    // Optionally reset selections, or keep them for quicker restart
    // setSelectedCategory(null);
    // setSelectedPlayerCount(null);
    // setSelectedDifficulty(null);
  };


  if (isGameStarted && selectedCategory && selectedPlayerCount !== null && selectedDifficulty !== null) {
    // Pass the handleReturnToSetup function and difficulty to GameBoard
    return <GameBoard category={selectedCategory} playerCount={selectedPlayerCount} difficulty={selectedDifficulty} onReturnToSetup={handleReturnToSetup} />;
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-2xl text-primary flex items-center gap-2">
          <Settings className="h-6 w-6" /> Configuração do Jogo {/* Translated */}
        </CardTitle>
        <CardDescription>Escolha as configurações do jogo antes de começar.</CardDescription> {/* Translated */}
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="category-select">Selecionar Categoria</Label> {/* Translated */}
          <Select
            onValueChange={(value) => setSelectedCategory(value)}
            value={selectedCategory ?? undefined}
          >
            <SelectTrigger id="category-select" className="w-full">
              <SelectValue placeholder="Selecione uma categoria..." /> {/* Translated */}
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="player-count-select">Número de Jogadores</Label> {/* Translated */}
          <Select
            onValueChange={(value) => setSelectedPlayerCount(parseInt(value, 10))}
             value={selectedPlayerCount?.toString() ?? undefined}
          >
            <SelectTrigger id="player-count-select" className="w-full">
              <SelectValue placeholder="Selecione o número de jogadores..." /> {/* Translated */}
            </SelectTrigger>
            <SelectContent>
              {PLAYER_COUNTS.map((count) => (
                <SelectItem key={count} value={count.toString()}>
                  {count} Jogador{count > 1 ? 'es' : ''} {/* Translated */}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Difficulty Selection Dropdown */}
        <div className="space-y-2">
          <Label htmlFor="difficulty-select">Selecionar Dificuldade</Label> {/* Translated */}
          <Select
            onValueChange={(value) => setSelectedDifficulty(value)}
            value={selectedDifficulty ?? undefined}
          >
            <SelectTrigger id="difficulty-select" className="w-full">
              <SelectValue placeholder="Selecione a dificuldade..." /> {/* Translated */}
            </SelectTrigger>
            <SelectContent>
              {DIFFICULTIES.map((difficulty) => (
                <SelectItem key={difficulty.value} value={difficulty.value}>
                  {difficulty.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>


        <Button
          onClick={handleStartGame}
          disabled={!selectedCategory || selectedPlayerCount === null || selectedDifficulty === null} // Added difficulty check to disabled state
          className="w-full"
          size="lg"
        >
          <Play className="mr-2 h-5 w-5" /> Iniciar Jogo {/* Translated */}
        </Button>
      </CardContent>
    </Card>
  );
}
