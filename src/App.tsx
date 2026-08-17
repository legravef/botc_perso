import { useState, type ReactNode } from 'react'
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
import { TrainingScreen } from './ui/screens/TrainingScreen'
import { HowToPlayScreen } from './ui/screens/HowToPlayScreen'

function App() {
  const game = useGameStore((s) => s.game)
  const closeGame = useGameStore((s) => s.closeGame)
  const [showReference, setShowReference] = useState(false)
  const [showTraining, setShowTraining] = useState(false)
  const [showHowToPlay, setShowHowToPlay] = useState(false)
  const [viewGrimoire, setViewGrimoire] = useState(false)

  // Route autonome ouverte en scannant un QR code de révélation : ne dépend
  // d'aucune partie chargée localement, uniquement du contenu de l'URL.
  if (isRoleShareHash(window.location.hash)) {
    return <PublicRoleView />
  }

  if (showReference) {
    return <CharacterReferenceScreen onBack={() => setShowReference(false)} scriptId={game?.scriptId} />
  }
  if (showTraining) {
    return <TrainingScreen onBack={() => setShowTraining(false)} />
  }
  if (showHowToPlay) {
    return <HowToPlayScreen onBack={() => setShowHowToPlay(false)} />
  }

  if (!game) {
    return (
      <HomeScreen
        onOpenCharacterReference={() => setShowReference(true)}
        onOpenTraining={() => setShowTraining(true)}
        onOpenHowToPlay={() => setShowHowToPlay(true)}
      />
    )
  }

  // Le grimoire s'affiche en superposition plutôt qu'en remplacement de l'écran courant : sinon
  // React démonte l'écran actif (ex. l'assistant de nuit) en y accédant puis en revenant, ce qui
  // réinitialise sa progression (retour à l'étape 1 de la nuit) — un aller-retour vers le
  // grimoire doit pouvoir se faire sans perdre sa place.
  let phaseScreen: ReactNode
  switch (game.phase) {
    case 'setup.players':
      phaseScreen = <PlayersSetupScreen />
      break
    case 'setup.composition':
      phaseScreen = <CompositionSetupScreen />
      break
    case 'setup.assignment':
      phaseScreen = <AssignmentScreen />
      break
    case 'setup.preparation':
      phaseScreen = <PreparationScreen />
      break
    case 'setup.seating':
      phaseScreen = <SeatingSetupScreen />
      break
    case 'setup.reveal':
      phaseScreen = <RevealScreen />
      break
    case 'night.first':
    case 'night.other':
      phaseScreen = <NightAssistantScreen onOpenGrimoire={() => setViewGrimoire(true)} />
      break
    case 'day.discussion':
      phaseScreen = <DayScreen onOpenGrimoire={() => setViewGrimoire(true)} />
      break
    case 'game.ended':
      phaseScreen = <GameEndScreen onGoHome={closeGame} />
      break
    default:
      phaseScreen = <GrimoireScreen onGoHome={closeGame} />
  }

  return (
    <>
      {phaseScreen}
      {viewGrimoire && (
        <div className="fixed inset-0 z-40">
          <GrimoireScreen onGoHome={closeGame} onBack={() => setViewGrimoire(false)} />
        </div>
      )}
    </>
  )
}

export default App
