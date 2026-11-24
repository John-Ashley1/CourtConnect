import { request, qs } from './client'

/** Upcoming games by other players, each with my_request (or null). filters: { sport, openOnly }. GET /api/games?sport=&status= */
export function listOpenGames({ sport, openOnly } = {}) {
  return request('/games' + qs({ sport: sport === 'All' ? '' : sport, status: openOnly ? 'OPEN' : '' }))
}

/** Games the signed-in player hosts, each with join_requests. GET /api/games/mine */
export const listMyHostedGames = () => request('/games/mine')

/** Join requests the signed-in player has sent, each with its game. GET /api/join-requests/mine */
export const listMyJoinRequests = () => request('/join-requests/mine')

/**
 * data: { title, sport_type, game_schedule (ISO), duration_minutes, location, max_players, skill_level }
 * POST /api/games
 */
export const createGame = (data) => request('/games', { method: 'POST', body: data })

/** POST /api/games/{gameId}/join-requests */
export const requestToJoin = (gameId) => request(`/games/${gameId}/join-requests`, { method: 'POST' })

/** Host approves (APPROVED) or declines (DECLINED); returns the updated hosted game. PATCH /api/join-requests/{requestId} */
export const respondToRequest = (requestId, status) => request(`/join-requests/${requestId}`, { method: 'PATCH', body: { status } })

/** POST /api/games/{gameId}/close */
export const closeGame = (gameId) => request(`/games/${gameId}/close`, { method: 'POST' })
