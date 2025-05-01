
'use client';

import React, { useState } from 'react';
import GameBoard from '@/components/game/game-board';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input'; // Import Input component
import { Settings, Play, BarChart, UserPlus, UserMinus } from 'lucide-react'; // Added icons

// Translated Categories
const CATEGORIES = ['Conhecimentos Gerais', 'Filmes', 'História', 'Ciência', 'Esportes', 'Tecnologia', 'Geografia'];
// Removed PLAYER_COUNTS
const MAX_PLAYERS = 6; // Set a maximum number of players
const DIFFICULTIES = [
    { value: 'facil', label: 'Fácil' },
    { value: 'medio', label: 'Médio' },
    { value: 'dificil', label: 'Difícil' },
];

export default function GameSetup() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  // Replace selectedPlayerCount with playerNames state
  const [playerNames, setPlayerNames] = useState<string[]>(['']); // Start with one player input
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(null);
  const [isGameStarted, setIsGameStarted] = useState(false);

  const handleAddPlayer = () => {
    if (playerNames.length < MAX_PLAYERS) {
      setPlayerNames((prev) => [...prev, '']);
    }
  };

  const handleRemovePlayer = (indexToRemove: number) => {
    if (playerNames.length > 1) { // Cannot remove the last player
      setPlayerNames((prev) => prev.filter((_, index) => index !== indexToRemove));
    }
  };

  const handlePlayerNameChange = (index: number, value: string) => {
    setPlayerNames((prev) =>
      prev.map((name, i) => (i === index ? value : name))
    );
  };

  const handleStartGame = () => {
    const validPlayerNames = playerNames.filter(name => name.trim() !== '');
    if (selectedCategory && selectedDifficulty !== null && validPlayerNames.length > 0) {
      setIsGameStarted(true);
    }
  };

  const handleReturnToSetup = () => {
    setIsGameStarted(false);
    // Keep selections for quicker restart
  };

  const validPlayerNames = playerNames.filter(name => name.trim() !== '');
  const canStartGame = selectedCategory && selectedDifficulty !== null && validPlayerNames.length > 0;

  if (isGameStarted && selectedCategory && selectedDifficulty !== null && validPlayerNames.length > 0) {
    return <GameBoard category={selectedCategory} playerNames={validPlayerNames} difficulty={selectedDifficulty} onReturnToSetup={handleReturnToSetup} />;
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-2xl text-primary flex items-center gap-2">
          <Settings className="h-6 w-6" /> Configuração do Jogo
        </CardTitle>
        <CardDescription>Escolha as configurações e adicione os jogadores.</CardDescription> {/* Updated description */}
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Category Selection */}
        <div className="space-y-2">
          <Label htmlFor="category-select">Selecionar Categoria</Label>
          <Select
            onValueChange={(value) => setSelectedCategory(value)}
            value={selectedCategory ?? undefined}
          >
            <SelectTrigger id="category-select" className="w-full">
              <SelectValue placeholder="Selecione uma categoria..." />
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

        {/* Difficulty Selection */}
        <div className="space-y-2">
          <Label htmlFor="difficulty-select">Selecionar Dificuldade</Label>
          <Select
            onValueChange={(value) => setSelectedDifficulty(value)}
            value={selectedDifficulty ?? undefined}
          >
            <SelectTrigger id="difficulty-select" className="w-full">
              <SelectValue placeholder="Selecione a dificuldade..." />
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

        {/* Player Name Inputs */}
        <div className="space-y-3">
           <Label>Jogadores ({playerNames.length}/{MAX_PLAYERS})</Label>
           {playerNames.map((name, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                id={`player-name-${index}`}
                type="text"
                placeholder={`Nome do Jogador ${index + 1}`} // Placeholder with player number
                value={name}
                onChange={(e) => handlePlayerNameChange(index, e.target.value)}
                className="flex-grow"
                maxLength={20} // Optional: limit name length
              />
              {playerNames.length > 1 && ( // Show remove button only if more than one player
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemovePlayer(index)}
                  aria-label="Remover Jogador"
                  className="text-destructive hover:bg-destructive/10"
                >
                  <UserMinus className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          {playerNames.length < MAX_PLAYERS && ( // Show add button if below max players
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddPlayer}
              className="w-full mt-2"
            >
              <UserPlus className="mr-2 h-4 w-4" /> Adicionar Jogador
            </Button>
          )}
        </div>

        {/* Start Game Button */}
        <Button
          onClick={handleStartGame}
          disabled={!canStartGame}
          className="w-full"
          size="lg"
        >
          <Play className="mr-2 h-5 w-5" /> Iniciar Jogo
        </Button>
      </CardContent>
    </Card>
  );
}
