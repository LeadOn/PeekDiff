import type { AgentRole } from '~/utils/val-assets'
import { agentIdFromUrl } from '~/utils/val-assets'

/**
 * Every playable agent and its role, from valorant-api.com (`/v1/agents?isPlayableCharacter=true`).
 * GameOn-API does not serve roles, so the table lives here: add a row when Riot ships an agent. An
 * agent missing from it simply has no role (neutral rule, no chip), never a wrong one.
 */
const AGENTS: { id: string, name: string, role: AgentRole }[] = [
  { id: '41fb69c1-4189-7b37-f117-bcaf1e96f1bf', name: 'Astra', role: 'controller' },
  { id: '5f8d3a7f-467b-97f3-062c-13acf203c006', name: 'Breach', role: 'initiator' },
  { id: '9f0d8ba9-4140-b941-57d3-a7ad57c6b417', name: 'Brimstone', role: 'controller' },
  { id: '22697a3d-45bf-8dd7-4fec-84a9e28c69d7', name: 'Chamber', role: 'sentinel' },
  { id: '1dbf2edd-4729-0984-3115-daa5eed44993', name: 'Clove', role: 'controller' },
  { id: '117ed9e3-49f3-6512-3ccf-0cada7e3823b', name: 'Cypher', role: 'sentinel' },
  { id: 'cc8b64c8-4b25-4ff9-6e7f-37b4da43d235', name: 'Deadlock', role: 'sentinel' },
  { id: 'dade69b4-4f5a-8528-247b-219e5a1facd6', name: 'Fade', role: 'initiator' },
  { id: 'e370fa57-4757-3604-3648-499e1f642d3f', name: 'Gekko', role: 'initiator' },
  { id: '95b78ed7-4637-86d9-7e41-71ba8c293152', name: 'Harbor', role: 'controller' },
  { id: 'ddd5a15c-4fbe-42fa-3789-11a55ca5ee04', name: 'Hush', role: 'duelist' },
  { id: '0e38b510-41a8-5780-5e8f-568b2a4f2d6c', name: 'Iso', role: 'duelist' },
  { id: 'add6443a-41bd-e414-f6ad-e58d267f4e95', name: 'Jett', role: 'duelist' },
  { id: '601dbbe7-43ce-be57-2a40-4abd24953621', name: 'KAY/O', role: 'initiator' },
  { id: '1e58de9c-4950-5125-93e9-a0aee9f98746', name: 'Killjoy', role: 'sentinel' },
  { id: '7c8a4701-4de6-9355-b254-e09bc2a34b72', name: 'Miks', role: 'controller' },
  { id: 'bb2a4828-46eb-8cd1-e765-15848195d751', name: 'Neon', role: 'duelist' },
  { id: '8e253930-4c05-31dd-1b6c-968525494517', name: 'Omen', role: 'controller' },
  { id: 'eb93336a-449b-9c1b-0a54-a891f7921d69', name: 'Phoenix', role: 'duelist' },
  { id: 'f94c3b30-42be-e959-889c-5aa313dba261', name: 'Raze', role: 'duelist' },
  { id: 'a3bfb853-43b2-7238-a4f1-ad90e9e46bcc', name: 'Reyna', role: 'duelist' },
  { id: '569fdd95-4d10-43ab-ca70-79becc718b46', name: 'Sage', role: 'sentinel' },
  { id: '6f2a04ca-43e0-be17-7f36-b3908627744d', name: 'Skye', role: 'initiator' },
  { id: '320b2a48-4d9b-a075-30f1-1f93a9b638fa', name: 'Sova', role: 'initiator' },
  { id: 'b444168c-4e35-8076-db47-ef9bf368f384', name: 'Tejo', role: 'initiator' },
  { id: '92eeef5d-43b5-1d4a-8d03-b3927a09034b', name: 'Veto', role: 'sentinel' },
  { id: '707eab51-4836-f488-046a-cda6bf494859', name: 'Viper', role: 'controller' },
  { id: 'efba5359-4016-a1e5-7626-b1ae76895940', name: 'Vyse', role: 'sentinel' },
  { id: 'df1cb487-4902-002e-5c17-d28e83e78588', name: 'Waylay', role: 'duelist' },
  { id: '7f94d92c-4234-0a36-9646-3a87eb8b5c89', name: 'Yoru', role: 'duelist' },
]

/** Names as the API stores them ("KAY/O"), compared without case or punctuation. */
const normalizeName = (name: string) => name.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')

const ROLE_BY_ID = new Map(AGENTS.map(agent => [agent.id, agent.role]))
const ROLE_BY_NAME = new Map(AGENTS.map(agent => [normalizeName(agent.name), agent.role]))

/**
 * An agent's role, read off its uuid (given, or found in an icon URL the API built on the CDN), else
 * off its name. `null` for an agent the table does not know yet.
 */
export function agentRole(agent: { id?: string | null, iconUrl?: string | null, name?: string | null }): AgentRole | null {
  const id = (agent.id ?? agentIdFromUrl(agent.iconUrl))?.toLowerCase()
  if (id) {
    const role = ROLE_BY_ID.get(id)
    if (role) return role
  }
  return agent.name ? ROLE_BY_NAME.get(normalizeName(agent.name)) ?? null : null
}
