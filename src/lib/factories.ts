import { nanoid } from 'nanoid'
import type { Player, Preparation } from '@/types'

export function createPlayer(name: string, seat: number, id: string = nanoid()): Player {
  return {
    id,
    name,
    seat,
    mapX: null,
    mapY: null,
    realCharacterId: null,
    perceivedCharacterId: null,
    alignment: 'good',
    alive: true,
    ghostVoteAvailable: true,
    reminders: [],
    statuses: [],
    notes: [],
  }
}

export function createEmptyPreparation(): Preparation {
  return {
    washerwoman: null,
    librarian: null,
    investigator: null,
    fortuneTellerRedHerringPlayerId: null,
    drunkBelievedCharacterId: null,
    impBluffCharacterIds: [],
    grandmotherRevealPlayerId: null,
  }
}
