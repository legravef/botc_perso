import { useState } from 'react'
import { getCharactersForScript } from '@/data'
import type { Character, CharacterCategory, ScriptId } from '@/types'
import { Screen } from '../components/Screen'
import { RoleIcon } from '../components/RoleIcon'
import { getScriptName } from '../scriptPresentation'

const CATEGORY_ORDER: CharacterCategory[] = ['townsfolk', 'outsider', 'minion', 'demon']
const CATEGORY_LABELS: Record<CharacterCategory, string> = { townsfolk: 'Villageois', outsider: 'Parias', minion: 'Sbires', demon: 'Démon' }

/** Aide de table : elle ne remplace pas le texte du rôle, mais met en avant ce que le MJ doit réellement arbitrer. */
const BMR_MJ_DETAILS: Record<string, string[]> = {
  grandmother: ['Montrez un joueur gentil et son rôle lors de la première nuit.', 'Si le Démon tue ce joueur, la Grand-mère meurt aussi.'],
  sailor: ['Cible un vivant, lui-même inclus. Décidez qui des deux est ivre jusqu’à l’aube.', 'Le Marin sobre ne peut pas mourir la nuit.'],
  chambermaid: ['Choisit deux autres vivants.', 'Montrez combien se sont réveillés à cause de leur pouvoir ; les joueurs ivres/empoisonnés comptent quand même.'],
  exorcist: ['Ne peut pas cibler la même personne deux nuits de suite.', 'Si la cible est le Démon, montrez l’Exorciste au Démon et ne le réveillez pas pour son pouvoir.'],
  innkeeper: ['Choisit deux vivants, lui-même inclus : ils ne meurent pas cette nuit.', 'Choisissez l’un des deux ivre jusqu’au crépuscule suivant.'],
  gambler: ['Peut choisir n’importe quel joueur, mort, vivant ou lui-même, puis annoncer un rôle.', 'S’il a tort, il meurt ; ne lui dites pas s’il a raison.'],
  gossip: ['Une seule déclaration publique par jour. Si elle est vraie, choisissez une mort la nuit suivante.', 'Vérifiez son état au moment du déclenchement nocturne.'],
  courtier: ['Une fois : choisissez un personnage, sans savoir s’il est en jeu.', 'S’il est en jeu, son détenteur est ivre pendant trois nuits et trois jours.'],
  professor: ['Une fois : choisissez un mort.', 'Seul un Villageois revient en jeu ; un autre rôle consomme quand même le pouvoir sans effet.'],
  minstrel: ['Si un Sbire est exécuté et meurt, tous les autres joueurs deviennent ivres immédiatement jusqu’au crépuscule suivant.'],
  'tea-lady': ['Ses deux voisins vivants les plus proches sont protégés s’ils sont gentils.', 'La protection vaut pour morts nocturnes et exécutions, sauf Assassin.'],
  pacifist: ['Lorsqu’un gentil est exécuté, le MJ peut décider qu’il survit.', 'Ne sauvez pas automatiquement : c’est un choix de narration.'],
  fool: ['La première mort qui devrait le tuer échoue, à condition qu’il soit sobre et qu’aucune autre protection ne l’ait déjà sauvé.'],
  goon: ['Le premier joueur qui le cible par un pouvoir chaque nuit devient ivre jusqu’au crépuscule.', 'Le Bras droit adopte alors son alignement. Les cibles suivantes n’ont pas cet effet.'],
  lunatic: ['Faites-lui croire qu’il est le Démon : faux Sbires et trois bluffs.', 'Le vrai Démon sait qui il est et voit ses cibles. Les victimes du Lunatique ne meurent pas nécessairement.'],
  tinker: ['Le MJ peut le faire mourir à tout moment.', 'Évitez de le faire mourir si cela termine la partie de façon injuste.'],
  moonchild: ['À l’annonce de sa mort, il choisit publiquement un vivant.', 'La nuit suivante, cette cible meurt seulement si elle était gentille au moment du choix.'],
  godfather: ['À la mise en place, choisissez +1 ou -1 Paria ; première nuit, montrez les rôles de Parias en jeu.', 'Il ne tue que la nuit suivant la mort diurne effective d’un Paria.'],
  'devils-advocate': ['Choisit un vivant, lui-même inclus, différent de sa cible précédente.', 'La cible survit à son exécution le lendemain ; ne peut pas choisir un Zombuul qui paraît mort.'],
  assassin: ['Une fois : choisissez n’importe quel joueur.', 'La mort ignore toutes les protections et immunités.'],
  mastermind: ['Si l’exécution du Démon devrait finir la partie, jouez une nuit puis un dernier jour.', 'Ce dernier jour : exécuter un gentil fait gagner le Mal ; exécuter un méchant ou ne personne exécuter fait gagner le Bien.'],
  zombuul: ['N’agit que si personne n’est mort pendant la journée.', 'Sa première mort est publique, mais il reste réellement vivant et continue de jouer.'],
  pukka: ['Première nuit incluse : empoisonne une cible ; à la nuit suivante, la cible précédente meurt puis redevient saine.', 'Si le Pukka est ivre/empoisonné, adaptez poison et mort différée selon son état.'],
  shabaloth: ['Choisit deux joueurs à tuer. Avant son réveil, une victime de sa précédente attaque peut revenir en jeu.', 'Une cible sauvée par une protection peut aussi être régurgitée.'],
  po: ['Peut tuer une personne ou choisir personne. Après une nuit sans cible, il doit choisir exactement trois personnes.', 'La première nuit ne compte pas comme une nuit sans cible.'],
}

function Details({ character, scriptId }: { character: Character; scriptId: ScriptId }) {
  const details = scriptId === 'bad-moon-rising' ? BMR_MJ_DETAILS[character.id] : undefined
  return (
    <>
      <p className="text-sm text-ink-1 mt-1 leading-relaxed">{character.fullDescription}</p>
      {details && <ul className="mt-3 pl-4 border-l-2 border-accent/35 flex flex-col gap-1 text-xs leading-relaxed text-ink-2">{details.map((detail) => <li key={detail}>{detail}</li>)}</ul>}
      {character.specialRules.length > 0 && <ul className="mt-3 pl-4 border-l-2 border-accent/35 flex flex-col gap-1 text-xs leading-relaxed text-ink-2">{character.specialRules.map((detail) => <li key={detail}>{detail}</li>)}</ul>}
      {(character.firstNightOrder !== null || character.otherNightOrder !== null) && <p className="text-xs text-accent mt-3">Ordre de nuit : {character.firstNightOrder !== null ? `première nuit ${character.firstNightOrder}` : '—'} · {character.otherNightOrder !== null ? `autres nuits ${character.otherNightOrder}` : '—'}</p>}
    </>
  )
}

export function CharacterReferenceScreen({ onBack, scriptId = 'trouble-brewing' }: { onBack: () => void; scriptId?: ScriptId }) {
  const [selectedScript, setSelectedScript] = useState<ScriptId>(scriptId)
  const characters = getCharactersForScript(selectedScript)
  const scriptName = getScriptName(selectedScript)
  return (
    <Screen title={`Personnages — ${scriptName}`} subtitle="Référence privée du MJ : texte du rôle, ordre de nuit et arbitrages importants." onBack={onBack}>
      <div className="max-w-3xl mx-auto flex flex-col gap-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sticky top-2 z-10 bg-surface-0 py-2">
          <button onClick={() => setSelectedScript('trouble-brewing')} className={`rounded-xl border px-4 py-3 font-medium ${selectedScript === 'trouble-brewing' ? 'border-accent bg-accent/15' : 'border-border bg-surface-1'}`}>Trouble Brewing</button>
          <button onClick={() => setSelectedScript('bad-moon-rising')} className={`rounded-xl border px-4 py-3 font-medium ${selectedScript === 'bad-moon-rising' ? 'border-accent bg-accent/15' : 'border-border bg-surface-1'}`}>Bad Moon Rising</button>
          <button onClick={() => setSelectedScript('no-greater-joy')} className={`rounded-xl border px-4 py-3 font-medium ${selectedScript === 'no-greater-joy' ? 'border-accent bg-accent/15' : 'border-border bg-surface-1'}`}>No Greater Joy</button>
        </div>
        {CATEGORY_ORDER.map((category) => (
          <section key={category}>
            <h2 className="text-lg font-semibold mb-3">{CATEGORY_LABELS[category]}</h2>
            <div className="flex flex-col gap-3">
              {characters.filter((character) => character.category === category).map((character) => (
                <div key={character.id} className="bg-surface-1 border border-border rounded-xl p-4 flex gap-3">
                  <RoleIcon characterId={character.id} nameFr={character.nameFr} size={44} />
                  <div className="flex-1 min-w-0"><div className="flex items-baseline justify-between gap-3"><h3 className="font-medium">{character.nameFr}</h3><span className="text-xs text-ink-2 shrink-0">{character.nameEn}</span></div><Details character={character} scriptId={selectedScript} /></div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </Screen>
  )
}
