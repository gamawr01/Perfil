'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Trophy, User } from 'lucide-react';

interface Player {
  id: string;
  name: string;
  score: number;
}

interface PlayerScoresProps {
  players: Player[];
  currentPlayerId: string | undefined;
}

export function PlayerScores({ players, currentPlayerId }: PlayerScoresProps) {
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  return (
    <Card className="w-full md:w-64 shrink-0">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2 text-primary">
          <Trophy className="h-5 w-5" /> Scores
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {sortedPlayers.map((player, index) => (
          <div
            key={player.id}
            className={`flex items-center justify-between p-3 rounded-md transition-colors ${
              player.id === currentPlayerId ? 'bg-accent ring-2 ring-primary' : 'bg-secondary'
            }`}
          >
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                 {/* Placeholder for player avatar - can be customized */}
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {player.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className={`font-medium ${player.id === currentPlayerId ? 'text-accent-foreground' : 'text-secondary-foreground'}`}>
                {index === 0 && <Trophy className="inline-block mr-1 h-4 w-4 text-yellow-500" />} {/* Crown for leader */}
                {player.name}
              </span>
            </div>
            <span className={`font-bold text-lg ${player.id === currentPlayerId ? 'text-accent-foreground' : 'text-primary'}`}>
              {player.score}
            </span>
          </div>
        ))}
         {players.length === 0 && (
            <p className="text-muted-foreground text-center italic">No players yet.</p>
         )}
      </CardContent>
    </Card>
  );
}
