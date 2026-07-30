import { useState } from 'react'
import { useGameStore } from '@/store'
import { isRoleShareHash } from '@/lib/roleShare'
import { HomeScreen } from './ui/screens/HomeScreen'
import { PlayersSetupScreen } from './ui/screens/PlayersSetupScreen'
import { CompositionSetupScreen } from './ui/screens/CompositionSetupScreen'
import { AssignmentScreen } from './ui/screens/AssignmentScreen'
import { PreparationScreen } from './ui/screens/PreparationScreen'
import { SeatingSetupScreen } from './ui/screens/SeatingSetupScreen'
import { RevealScreen } from './ui/screens/RevealScreen'
import { NightAssistantScreen } from './ui/screens/NightAssistantScreen'
import { DayScreen } from './ui/screens/DayScreen'
import { GameEndScreen } from './ui/screens/GameEndScreen'
import { GrimoireScreen } from './ui/screens/GrimoireScreen'
import { CharacterReferenceScreen } from './ui/screens/CharacterReferenceScreen'
import { PublicRoleView } from './ui/screens/PublicRoleView'

function App() {
  const game = useGameStore((s) => s.game)
  const closeGame = useGameStore((s) => s.closeGame)
  const [showReference, setShowReference] = useState(false)
  const [viewGrimoire, setViewGrimoire] = useState(false)

  // Route autonome ouverte en scannant un QR code de révélation : ne dépend
  // d'aucune partie chargée localement, uniquement du contenu de l'URL.
  if (isRoleShareHash(window.location.hash)) {
    return <PublicRoleView />
  }

  if (showReference) {
    return <CharacterReferenceScreen onBack={() => setShowReference(false)} />
  }

  if (!game) {
    return <HomeScreen onOpenCharacterReference={() => setShowReference(true)} />
  }

  if (viewGrimoire) {
    return <GrimoireScreen onGoHome={closeGame} onBack={() => setViewGrimoire(false)} />
  }

  switch (game.phase) {
    case 'setup.players':
      return <PlayersSetupScreen />
    case 'setup.composition':
      return <CompositionSetupScreen />
    case 'setup.assignment':
      return <AssignmentScreen />
    case 'setup.preparation':
      return <PreparationScreen />
    case 'setup.seating':
      return <SeatingSetupScreen />
    case 'setup.reveal':
      return <RevealScreen />
    case 'night.first':
    case 'night.other':
      return <NightAssistantScreen onOpenGrimoire={() => setViewGrimoire(true)} />
    case 'day.discussion':
      return <DayScreen onOpenGrimoire={() => setViewGrimoire(true)} />
    case 'game.ended':
      return <GameEndScreen onGoHome={closeGame} />
    default:
      return <GrimoireScreen onGoHome={closeGame} />
  }
}

export default App
