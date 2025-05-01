import GameSetup from '@/components/game/game-setup'; // Import the new GameSetup component

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 md:p-12 lg:p-24 bg-background"> {/* Adjusted padding */}
      <div className="w-full max-w-6xl flex flex-col items-center"> {/* Wrapper for centering */}
        <h1 className="text-3xl md:text-4xl font-bold mb-6 md:mb-8 text-primary text-center">Perfil Online</h1>
        <GameSetup /> {/* Render the GameSetup component */}
      </div>
    </main>
  );
}
