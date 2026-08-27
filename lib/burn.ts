export type BurnBreakdown = {
  bmrPassive: number
  activity: number
  nonActivitySteps: number
  total: number
}

export function calculateBmr(
  weightKg: number,
  heightCm: number,
  age: number,
  sex: 'male' | 'female' | 'other'
): number {
  const maleBmr = 10 * weightKg + 6.25 * heightCm - 5 * age + 5
  const femaleBmr = 10 * weightKg + 6.25 * heightCm - 5 * age - 161

  if (sex === 'male') {
    return maleBmr
  } else if (sex === 'female') {
    return femaleBmr
  } else {
    return (maleBmr + femaleBmr) / 2
  }
}

export function calculateBurnBreakdown(params: {
  weightKg: number
  heightCm: number
  age: number
  sex: 'male' | 'female' | 'other'
  activityCalories: number
  activityDurationS: number
  totalSteps: number
  activitySteps: number
}): BurnBreakdown {
  const bmr = calculateBmr(
    params.weightKg,
    params.heightCm,
    params.age,
    params.sex
  )

  const activityHours = params.activityDurationS / 3600
  const passiveFraction = Math.max(0, 24 - activityHours) / 24
  const bmrPassive = Math.round(bmr * passiveFraction)

  const nonActivitySteps = Math.max(0, params.totalSteps - params.activitySteps)
  // ponytail: fixed 0.04 kcal/step, revisit with run/walk split when step type data available
  const nonActivityStepsCal = Math.round(nonActivitySteps * 0.04)

  return {
    bmrPassive,
    activity: params.activityCalories,
    nonActivitySteps: nonActivityStepsCal,
    total: bmrPassive + params.activityCalories + nonActivityStepsCal,
  }
}
