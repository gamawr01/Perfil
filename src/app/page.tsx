import GameBoard from '@/components/game/game-board';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 md:p-24 bg-background">
      <h1 className="text-4xl font-bold mb-8 text-primary">Perfil Online</h1>
      <GameBoard />
    </main>
  );
}
