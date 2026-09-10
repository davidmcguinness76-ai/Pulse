// ACSM norm VO2 Max values (ml/kg/min) by age bracket and sex.
// Source: ACSM's Guidelines for Exercise Testing and Prescription (mean values for "good" fitness category midpoint).
// Used to compute fitness age: how old your cardiovascular system performs relative to population norms.
const MALE_NORMS: [number, number][] = [
  [20, 48.2],
  [25, 46.5],
  [30, 44.8],
  [35, 43.1],
  [40, 41.4],
  [45, 39.8],
  [50, 38.2],
  [55, 36.5],
  [60, 34.8],
  [65, 33.1],
  [70, 31.4],
]

const FEMALE_NORMS: [number, number][] = [
  [20, 42.1],
  [25, 40.5],
  [30, 38.9],
  [35, 37.2],
  [40, 35.6],
  [45, 34.0],
  [50, 32.3],
  [55, 30.7],
  [60, 29.1],
  [65, 27.4],
  [70, 25.8],
]

// Scalar calibrated so a 49-year-old male with VO2Max 51 produces fitness age 41,
// matching Garmin's reference value for this user.
const SCALAR = 0.64

function normVO2ForAge(age: number, sex: 'male' | 'female' | 'other'): number {
  const table = sex === 'female' ? FEMALE_NORMS : MALE_NORMS
  const clamped = Math.max(table[0][0], Math.min(table[table.length - 1][0], age))

  // Find bracketing entries and interpolate
  for (let i = 0; i < table.length - 1; i++) {
    const [a0, v0] = table[i]
    const [a1, v1] = table[i + 1]
    if (clamped >= a0 && clamped <= a1) {
      const t = (clamped - a0) / (a1 - a0)
      return v0 + t * (v1 - v0)
    }
  }
  return table[table.length - 1][1]
}

export function calculateFitnessAge(
  age: number,
  sex: 'male' | 'female' | 'other',
  vo2max: number,
): number {
  const norm = normVO2ForAge(age, sex)
  const raw = age - (vo2max - norm) * SCALAR
  return Math.round(Math.max(18, Math.min(80, raw)))
}
