import { useState } from 'react';
import { SecurityPortal } from './components/SecurityPortal';
import { MainDashboard } from './components/MainDashboard';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  if (!isAuthenticated) {
    return (
      <SecurityPortal 
        onAuthSuccess={(id) => {
          setUserId(id);
          setIsAuthenticated(true);
        }} 
      />
    );
  }

  // Si authentifié, on affiche le tableau de bord RATISS 4 Fusion sécurisé
  return <MainDashboard userId={userId} />;
}
