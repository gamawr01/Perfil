
'use client';

import React, { useState, useEffect } from 'react';
import GameBoard from '@/components/game/game-board';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Settings, Play, UserPlus, UserMinus, CheckCircle, XCircle, Loader2, ListChecks, Eraser } from 'lucide-react';
import { validateCategory } from '@/ai/flows/validate-category'; // Import the validation flow
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator'; // Import Separator


// Translated Categories
const CATEGORIES = ['Conhecimentos Gerais', 'Filmes', 'História', 'Ciência', 'Esportes', 'Tecnologia', 'Geografia', 'Música', 'Literatura', 'Arte'];
const MAX_PLAYERS = 6;
const DIFFICULTIES = [
    { value: 'facil', label: 'Fácil' },
    { value: 'medio', label: 'Médio' },
    { value: 'dificil', label: 'Difícil' },
];

type CustomCategoryStatus = 'idle' | 'verifying' | 'valid' | 'invalid';

export default function GameSetup() {
  const [selectedPredefinedCategory, setSelectedPredefinedCategory] = useState<string | null>(null);
  const [playerNames, setPlayerNames] = useState<string[]>(['']);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('medio'); // Default to 'medio'
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [customCategoryInput, setCustomCategoryInput] = useState<string>('');
  const [customCategoryStatus, setCustomCategoryStatus] = useState<CustomCategoryStatus>('idle');
  const [customCategoryReason, setCustomCategoryReason] = useState<string | null>(null);
  const [finalSelectedCategory, setFinalSelectedCategory] = useState<string | null>(null); // Holds the category used to start the game

  const { toast } = useToast();

  // Effect to update the final selected category when either predefined or custom changes
  useEffect(() => {
    if (customCategoryStatus === 'valid') {
      setFinalSelectedCategory(customCategoryInput);
      setSelectedPredefinedCategory(null); // Clear predefined if custom is valid
    } else {
      setFinalSelectedCategory(selectedPredefinedCategory);
    }
  }, [selectedPredefinedCategory, customCategoryStatus, customCategoryInput]);


  const handleAddPlayer = () => {
    if (playerNames.length < MAX_PLAYERS) {
      setPlayerNames((prev) => [...prev, '']);
    }
  };

  const handleRemovePlayer = (indexToRemove: number) => {
    if (playerNames.length > 1) {
      setPlayerNames((prev) => prev.filter((_, index) => index !== indexToRemove));
    }
  };

  const handlePlayerNameChange = (index: number, value: string) => {
    setPlayerNames((prev) =>
      prev.map((name, i) => (i === index ? value : name))
    );
  };

  const handleVerifyCategory = async () => {
    if (!customCategoryInput.trim()) {
      toast({ title: "Erro", description: "Por favor, insira uma categoria personalizada.", variant: "destructive" });
      return;
    }
    setCustomCategoryStatus('verifying');
    setCustomCategoryReason(null);
    setFinalSelectedCategory(null); // Clear final category during verification

    try {
      const result = await validateCategory({ category: customCategoryInput });
      if (result.isValid) {
        setCustomCategoryStatus('valid');
        toast({ title: "Categoria Válida!", description: `"${customCategoryInput}" é uma boa categoria para jogar.`, variant: 'default', className: 'bg-accent text-accent-foreground' });
      } else {
        setCustomCategoryStatus('invalid');
        setCustomCategoryReason(result.reason || "A IA não forneceu um motivo específico.");
        toast({ title: "Categoria Inválida", description: result.reason || "Esta categoria não parece adequada para o jogo.", variant: "destructive" });
      }
    } catch (error) {
      console.error("Erro ao validar categoria:", error);
      setCustomCategoryStatus('invalid');
      setCustomCategoryReason("Ocorreu um erro ao verificar a categoria com a IA.");
      toast({ title: "Erro de Verificação", description: "Não foi possível validar a categoria. Tente novamente.", variant: "destructive" });
    }
  };

  const handleClearCustomCategory = () => {
    setCustomCategoryInput('');
    setCustomCategoryStatus('idle');
    setCustomCategoryReason(null);
    setFinalSelectedCategory(selectedPredefinedCategory); // Revert to predefined if one was selected
  };

  const handleStartGame = () => {
    const validPlayerNames = playerNames.filter(name => name.trim() !== '');
    if (finalSelectedCategory && selectedDifficulty && validPlayerNames.length > 0) {
      // Pass the final category (either predefined or verified custom)
      setIsGameStarted(true);
    } else {
       toast({ title: "Configuração Incompleta", description: "Verifique se selecionou uma categoria válida, dificuldade e adicionou jogadores.", variant: "destructive" });
    }
  };

  const handleReturnToSetup = () => {
    setIsGameStarted(false);
    // Option: Reset selections or keep them for quicker restart
    // setFinalSelectedCategory(null);
    // setSelectedPredefinedCategory(null);
    // setSelectedDifficulty('medio');
    // setPlayerNames(['']);
    // handleClearCustomCategory();
  };

  const validPlayerNames = playerNames.filter(name => name.trim() !== '');
  // Can start if a final category is selected (predefined or valid custom), difficulty is set, and there's at least one player
  const canStartGame = !!finalSelectedCategory && !!selectedDifficulty && validPlayerNames.length > 0;

  if (isGameStarted && finalSelectedCategory && selectedDifficulty && validPlayerNames.length > 0) {
    return <GameBoard category={finalSelectedCategory} playerNames={validPlayerNames} difficulty={selectedDifficulty} onReturnToSetup={handleReturnToSetup} />;
  }

  return (
    <Card className="w-full max-w-lg"> {/* Increased max-width slightly */}
      <CardHeader>
        <CardTitle className="text-2xl text-primary flex items-center gap-2">
          <Settings className="h-6 w-6" /> Configuração do Jogo
        </CardTitle>
        <CardDescription>Escolha as configurações, adicione jogadores e defina a categoria.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Predefined Category Selection */}
        <div className="space-y-2">
          <Label htmlFor="category-select">Selecionar Categoria Pronta</Label>
          <Select
            onValueChange={(value) => {
                if (customCategoryStatus !== 'valid') { // Only allow changing predefined if custom isn't locked in
                    setSelectedPredefinedCategory(value);
                    setFinalSelectedCategory(value); // Update final category directly
                }
            }}
            value={selectedPredefinedCategory ?? undefined}
            disabled={customCategoryStatus === 'valid'} // Disable if custom is valid
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
          {customCategoryStatus === 'valid' && (
              <p className="text-xs text-muted-foreground">Categoria personalizada ativa. Limpe-a para escolher uma pré-definida.</p>
          )}
        </div>

        <Separator />

        {/* Custom Category Input */}
        <div className="space-y-2">
            <Label htmlFor="custom-category-input">Ou Crie Sua Categoria</Label>
            <div className="flex items-center gap-2">
            <Input
                id="custom-category-input"
                type="text"
                placeholder="Ex: Atores Brasileiros, Capitais Europeias..."
                value={customCategoryInput}
                onChange={(e) => {
                    setCustomCategoryInput(e.target.value);
                    if (customCategoryStatus !== 'idle') { // Reset status if user types again
                       setCustomCategoryStatus('idle');
                       setCustomCategoryReason(null);
                       setFinalSelectedCategory(selectedPredefinedCategory); // Revert to predefined
                    }
                }}
                disabled={customCategoryStatus === 'verifying'}
                className="flex-grow"
                maxLength={50}
            />
            {customCategoryStatus === 'idle' && customCategoryInput && (
                 <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleVerifyCategory}
                    disabled={!customCategoryInput.trim()}
                    aria-label="Verificar Categoria"
                    title="Verificar Categoria"
                >
                    <ListChecks className="h-4 w-4" />
                </Button>
            )}
             {customCategoryStatus === 'verifying' && (
                 <Button type="button" variant="outline" size="icon" disabled>
                    <Loader2 className="h-4 w-4 animate-spin" />
                 </Button>
            )}
             {customCategoryStatus === 'valid' && (
                 <Button type="button" variant="ghost" size="icon" disabled className="text-green-600">
                    <CheckCircle className="h-4 w-4" />
                 </Button>
            )}
            {customCategoryStatus === 'invalid' && (
                 <Button type="button" variant="ghost" size="icon" disabled className="text-destructive">
                    <XCircle className="h-4 w-4" />
                 </Button>
            )}
             {customCategoryStatus !== 'idle' && customCategoryStatus !== 'verifying' && (
                 <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handleClearCustomCategory}
                    aria-label="Limpar Categoria Personalizada"
                    title="Limpar Categoria Personalizada"
                    className="text-muted-foreground hover:text-foreground"
                >
                    <Eraser className="h-4 w-4" />
                </Button>
            )}
            </div>
            {customCategoryStatus === 'invalid' && customCategoryReason && (
                <p className="text-sm text-destructive">{customCategoryReason}</p>
            )}
             {customCategoryStatus === 'valid' && (
                <p className="text-sm text-green-600">Categoria personalizada selecionada: "{customCategoryInput}"</p>
            )}
        </div>

        <Separator />


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
                placeholder={`Nome do Jogador ${index + 1}`}
                value={name}
                onChange={(e) => handlePlayerNameChange(index, e.target.value)}
                className="flex-grow"
                maxLength={20}
              />
              {playerNames.length > 1 && (
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
          {playerNames.length < MAX_PLAYERS && (
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
          disabled={!canStartGame || customCategoryStatus === 'verifying'} // Disable if verifying custom category
          className="w-full"
          size="lg"
        >
           {customCategoryStatus === 'verifying' ? (
               <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Verificando Categoria...
               </>
            ) : (
                <>
                 <Play className="mr-2 h-5 w-5" /> Iniciar Jogo
                </>
            )}
        </Button>
      </CardContent>
    </Card>
  );
}
