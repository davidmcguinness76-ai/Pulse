import { describe, it, expect } from 'vitest'
import { parseWellness, parseActivity } from './parser'

describe('parseWellness', () => {
  it('maps confirmed Intervals.icu fields to internal types', () => {
    const raw = {
      id: '2026-08-25',
      restingHR: 40,
      hrv: 95.0,
      sleepSecs: 22860,
      sleepScore: 79.0,
      sleepQuality: 3,
      steps: 17686,
      weight: 65.7,
      vo2max: 49.0,
    }
    const result = parseWellness(raw)
    expect(result.date).toBe('2026-08-25')
    expect(result.restingHr).toBe(40)
    expect(result.hrvRmssd).toBe(95.0)
    expect(result.sleepDurationS).toBe(22860)
    expect(result.sleepScore).toBe(79)
    expect(result.sleepQuality).toBe(3)
    expect(result.steps).toBe(17686)
    expect(result.weight).toBe(65.7)
    expect(result.vo2max).toBe(49.0)
  })

  it('handles null fields gracefully', () => {
    const raw = { id: '2026-08-26', restingHR: 40, hrv: 111.0, sleepSecs: null, sleepScore: null, sleepQuality: null, steps: 17087, weight: null, vo2max: null }
    const result = parseWellness(raw)
    expect(result.sleepDurationS).toBeNull()
    expect(result.sleepScore).toBeNull()
    expect(result.steps).toBe(17087)
  })
})

describe('parseActivity', () => {
  it('maps a walk activity to internal type', () => {
    const raw = {
      id: 'i180053414',
      type: 'Walk',
      name: 'Richmond upon Thames Walking',
      start_date_local: '2026-08-25T12:50:21',
      elapsed_time: 3402,
      distance: 4499.58,
      average_heartrate: 80,
      max_heartrate: 104,
      calories: 181,
      total_elevation_gain: 23.0,
      average_speed: 1.323,
    }
    const result = parseActivity(raw)
    expect(result.intervalsActivityId).toBe('i180053414')
    expect(result.type).toBe('walk')
    expect(result.name).toBe('Richmond upon Thames Walking')
    expect(result.durationS).toBe(3402)
    expect(result.distanceM).toBeCloseTo(4499.58)
    expect(result.avgHr).toBe(80)
    expect(result.caloriesBurned).toBe(181)
  })

  it('maps Run type correctly', () => {
    const raw = { id: 'i999', type: 'Run', name: 'Morning Run', start_date_local: '2026-08-20T07:00:00', elapsed_time: 1800, distance: 5000, average_heartrate: 145, max_heartrate: 170, calories: 400, total_elevation_gain: 50, average_speed: 2.78 }
    expect(parseActivity(raw).type).toBe('run')
  })

  it('falls back to "other" for unknown types', () => {
    const raw = { id: 'i123', type: 'Kayaking', name: 'Sea kayak', start_date_local: '2026-08-01T09:00:00', elapsed_time: 7200, distance: 10000, average_heartrate: null, max_heartrate: null, calories: null, total_elevation_gain: null, average_speed: null }
    expect(parseActivity(raw).type).toBe('other')
  })
})
