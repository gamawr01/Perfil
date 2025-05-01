
'use client';

import React, { useState } from 'react';
import GameBoard from '@/components/game/game-board';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, Play } from 'lucide-react';

// Translated Categories
const CATEGORIES = ['Conhecimentos Gerais', 'Filmes', 'História', 'Ciência', 'Esportes', 'Tecnologia', 'Geografia'];
const PLAYER_COUNTS = [1, 2, 3, 4];

export default function GameSetup() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedPlayerCount, setSelectedPlayerCount] = useState<number | null>(null);
  const [isGameStarted, setIsGameStarted] = useState(false);

  const handleStartGame = () => {
    if (selectedCategory && selectedPlayerCount !== null) {
      setIsGameStarted(true);
    }
  };

  // Handler to return to the setup screen
  const handleReturnToSetup = () => {
    setIsGameStarted(false);
    // Optionally reset selections, or keep them for quicker restart
    // setSelectedCategory(null);
    // setSelectedPlayerCount(null);
  };


  if (isGameStarted && selectedCategory && selectedPlayerCount !== null) {
    // Pass the handleReturnToSetup function to GameBoard
    return <GameBoard category={selectedCategory} playerCount={selectedPlayerCount} onReturnToSetup={handleReturnToSetup} />;
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

        <Button
          onClick={handleStartGame}
          disabled={!selectedCategory || selectedPlayerCount === null}
          className="w-full"
          size="lg"
        >
          <Play className="mr-2 h-5 w-5" /> Iniciar Jogo {/* Translated */}
        </Button>
      </CardContent>
    </Card>
  );
}
