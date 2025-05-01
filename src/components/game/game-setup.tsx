
'use client';

import React, { useState } from 'react';
import GameBoard from '@/components/game/game-board';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, Play } from 'lucide-react';

const CATEGORIES = ['General Knowledge', 'Movies', 'History', 'Science', 'Sports'];
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

  if (isGameStarted && selectedCategory && selectedPlayerCount !== null) {
    return <GameBoard category={selectedCategory} playerCount={selectedPlayerCount} />;
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-2xl text-primary flex items-center gap-2">
          <Settings className="h-6 w-6" /> Game Setup
        </CardTitle>
        <CardDescription>Choose your game settings before starting.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="category-select">Select Category</Label>
          <Select
            onValueChange={(value) => setSelectedCategory(value)}
            value={selectedCategory ?? undefined}
          >
            <SelectTrigger id="category-select" className="w-full">
              <SelectValue placeholder="Select a category..." />
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
          <Label htmlFor="player-count-select">Number of Players</Label>
          <Select
            onValueChange={(value) => setSelectedPlayerCount(parseInt(value, 10))}
             value={selectedPlayerCount?.toString() ?? undefined}
          >
            <SelectTrigger id="player-count-select" className="w-full">
              <SelectValue placeholder="Select number of players..." />
            </SelectTrigger>
            <SelectContent>
              {PLAYER_COUNTS.map((count) => (
                <SelectItem key={count} value={count.toString()}>
                  {count} Player{count > 1 ? 's' : ''}
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
          <Play className="mr-2 h-5 w-5" /> Start Game
        </Button>
      </CardContent>
    </Card>
  );
}
