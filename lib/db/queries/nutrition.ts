import { eq, and, sum } from 'drizzle-orm'
import { db } from '@/lib/db'
import { foods, nutritionLog } from '@/lib/db/schema'

export type LogFoodParams = {
  userId: string
  date: string
  mealCategory: 'breakfast' | 'lunch' | 'dinner' | 'snacks'
  foodId?: string
  foodData?: {
    name: string
    brand?: string
    caloriesPer100g: number
    proteinPer100g: number
    carbsPer100g: number
    fatPer100g: number
    fibrePer100g: number
    servingSizeG: number
    source: 'open_food_facts' | 'manual'
  }
  quantityG: number
}

export type LogEntry = {
  id: string
  foodName: string
  brand: string | null
  quantityG: number
  calories: number
}

export type MealGroup = {
  category: 'breakfast' | 'lunch' | 'dinner' | 'snacks'
  entries: LogEntry[]
  totalCalories: number
}

const MEAL_ORDER = ['breakfast', 'lunch', 'dinner', 'snacks'] as const

export async function logFood(params: LogFoodParams): Promise<void> {
  let foodId = params.foodId

  if (!foodId && params.foodData) {
    const fd = params.foodData
    const [inserted] = await db
      .insert(foods)
      .values({
        name: fd.name,
        brand: fd.brand,
        calories: fd.caloriesPer100g,
        proteinG: fd.proteinPer100g,
        carbsG: fd.carbsPer100g,
        fatG: fd.fatPer100g,
        fibreG: fd.fibrePer100g,
        servingSizeG: fd.servingSizeG,
        servingUnit: 'g',
        source: fd.source,
        verifiedByUser: false,
      })
      .onConflictDoNothing()
      .returning({ id: foods.id })

    if (inserted) {
      foodId = inserted.id
    } else {
      // food already existed (race) — look it up
      const existing = await db.query.foods.findFirst({ where: eq(foods.name, fd.name) })
      foodId = existing!.id
    }
  }

  if (!foodId) throw new Error('logFood: no foodId and no foodData provided')

  const food = await db.query.foods.findFirst({ where: eq(foods.id, foodId) })
  if (!food) throw new Error(`logFood: food ${foodId} not found`)

  const caloriesPer100g = food.calories ?? 0
  const calories = Math.round((params.quantityG / 100) * caloriesPer100g)
  const proteinG = food.proteinG ? Math.round((params.quantityG / 100) * food.proteinG * 10) / 10 : null
  const carbsG = food.carbsG ? Math.round((params.quantityG / 100) * food.carbsG * 10) / 10 : null
  const fatG = food.fatG ? Math.round((params.quantityG / 100) * food.fatG * 10) / 10 : null
  const fibreG = food.fibreG ? Math.round((params.quantityG / 100) * food.fibreG * 10) / 10 : null

  await db.insert(nutritionLog).values({
    userId: params.userId,
    foodId,
    loggedAt: params.date,
    mealCategory: params.mealCategory,
    quantityG: params.quantityG,
    calories,
    proteinG,
    carbsG,
    fatG,
    fibreG,
  })
}

export async function getTodayLog(userId: string, date: string): Promise<MealGroup[]> {
  const rows = await db
    .select({
      id: nutritionLog.id,
      mealCategory: nutritionLog.mealCategory,
      quantityG: nutritionLog.quantityG,
      calories: nutritionLog.calories,
      foodName: foods.name,
      brand: foods.brand,
    })
    .from(nutritionLog)
    .innerJoin(foods, eq(nutritionLog.foodId, foods.id))
    .where(and(eq(nutritionLog.userId, userId), eq(nutritionLog.loggedAt, date)))

  const grouped = new Map<string, LogEntry[]>()
  for (const cat of MEAL_ORDER) grouped.set(cat, [])

  for (const row of rows) {
    const cat = row.mealCategory ?? 'snacks'
    grouped.get(cat)!.push({
      id: row.id,
      foodName: row.foodName,
      brand: row.brand,
      quantityG: row.quantityG ?? 0,
      calories: row.calories ?? 0,
    })
  }

  return MEAL_ORDER.map(cat => {
    const entries = grouped.get(cat)!
    return {
      category: cat,
      entries,
      totalCalories: entries.reduce((s, e) => s + e.calories, 0),
    }
  })
}

export async function getTodayConsumedCalories(userId: string, date: string): Promise<number> {
  const result = await db
    .select({ total: sum(nutritionLog.calories) })
    .from(nutritionLog)
    .where(and(eq(nutritionLog.userId, userId), eq(nutritionLog.loggedAt, date)))
  return Number(result[0]?.total ?? 0)
}

export async function deleteLogEntry(id: string, userId: string): Promise<void> {
  await db
    .delete(nutritionLog)
    .where(and(eq(nutritionLog.id, id), eq(nutritionLog.userId, userId)))
}
