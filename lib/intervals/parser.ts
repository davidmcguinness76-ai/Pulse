export type IntervalsWellness = {
  id: string
  restingHR: number | null
  hrv: number | null
  sleepSecs: number | null
  sleepScore: number | null
  sleepQuality: number | null
  steps: number | null
  weight: number | null
  vo2max: number | null
  [key: string]: unknown
}

export type IntervalsActivity = {
  id: string
  type: string
  name: string
  start_date_local: string
  elapsed_time: number | null
  distance: number | null
  average_heartrate: number | null
  max_heartrate: number | null
  calories: number | null
  total_elevation_gain: number | null
  average_speed: number | null
  [key: string]: unknown
}

export type ParsedWellness = {
  date: string
  restingHr: number | null
  hrvRmssd: number | null
  sleepDurationS: number | null
  sleepScore: number | null
  sleepQuality: number | null
  steps: number | null
  weight: number | null
  vo2max: number | null
}

export type ParsedActivity = {
  intervalsActivityId: string
  type: 'run' | 'walk' | 'cycle' | 'swim' | 'strength' | 'other'
  name: string
  startedAt: Date
  durationS: number | null
  distanceM: number | null
  avgPaceSPerKm: number | null
  avgHr: number | null
  maxHr: number | null
  caloriesBurned: number | null
  elevationM: number | null
  rawJson: string
}

const TYPE_MAP: Record<string, ParsedActivity['type']> = {
  Run: 'run',
  Walk: 'walk',
  Ride: 'cycle',
  VirtualRide: 'cycle',
  Swim: 'swim',
  WeightTraining: 'strength',
  Workout: 'strength',
}

export function parseWellness(raw: IntervalsWellness): ParsedWellness {
  return {
    date: raw.id,
    restingHr: raw.restingHR ?? null,
    hrvRmssd: raw.hrv ?? null,
    sleepDurationS: raw.sleepSecs ?? null,
    sleepScore: raw.sleepScore != null ? Math.round(raw.sleepScore) : null,
    sleepQuality: raw.sleepQuality ?? null,
    steps: raw.steps ?? null,
    weight: raw.weight ?? null,
    vo2max: raw.vo2max ?? null,
  }
}

export function parseActivity(raw: IntervalsActivity): ParsedActivity {
  const speedMs = raw.average_speed
  const avgPaceSPerKm = speedMs && speedMs > 0 ? 1000 / speedMs : null
  return {
    intervalsActivityId: raw.id,
    type: TYPE_MAP[raw.type] ?? 'other',
    name: raw.name ?? 'Activity',
    startedAt: new Date(raw.start_date_local),
    durationS: raw.elapsed_time ?? null,
    distanceM: raw.distance ?? null,
    avgPaceSPerKm,
    avgHr: raw.average_heartrate != null ? Math.round(raw.average_heartrate) : null,
    maxHr: raw.max_heartrate ?? null,
    caloriesBurned: raw.calories ?? null,
    elevationM: raw.total_elevation_gain ?? null,
    rawJson: JSON.stringify(raw),
  }
}
