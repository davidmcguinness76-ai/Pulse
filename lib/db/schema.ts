import { pgTable, text, integer, real, boolean, timestamp, date, pgEnum, uuid } from 'drizzle-orm/pg-core'

export const activityTypeEnum = pgEnum('activity_type', ['run', 'walk', 'cycle', 'swim', 'strength', 'other'])
export const servingUnitEnum = pgEnum('serving_unit', ['g', 'ml', 'item'])
export const foodSourceEnum = pgEnum('food_source', ['open_food_facts', 'manual', 'ai_scan'])
export const sexEnum = pgEnum('sex', ['male', 'female', 'other'])
export const activityLevelEnum = pgEnum('activity_level', ['sedentary', 'light', 'moderate', 'active', 'very_active'])
export const wellnessSourceEnum = pgEnum('wellness_source', ['manual', 'intervals_icu'])

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  clerkId: text('clerk_id').notNull().unique(),
  email: text('email').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  heightCm: real('height_cm'),
  weightKg: real('weight_kg'),
  age: integer('age'),
  sex: sexEnum('sex'),
  activityLevel: activityLevelEnum('activity_level'),
  calorieGoal: real('calorie_goal'),
  proteinG: real('protein_g'),
  carbsG: real('carbs_g'),
  fatG: real('fat_g'),
  fibreG: real('fibre_g'),
  sugarG: real('sugar_g'),
  satFatG: real('sat_fat_g'),
  polyFatG: real('poly_fat_g'),
  monoFatG: real('mono_fat_g'),
  transFatG: real('trans_fat_g'),
  cholesterolMg: real('cholesterol_mg'),
  sodiumMg: real('sodium_mg'),
  potassiumMg: real('potassium_mg'),
  calciumMg: real('calcium_mg'),
  ironMg: real('iron_mg'),
  vitaminAPct: real('vitamin_a_pct'),
  vitaminCPct: real('vitamin_c_pct'),
})

export const activities = pgTable('activities', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  intervalsActivityId: text('intervals_activity_id').notNull().unique(),
  type: activityTypeEnum('type').notNull(),
  name: text('name'),
  startedAt: timestamp('started_at').notNull(),
  durationS: integer('duration_s'),
  distanceM: real('distance_m'),
  avgPaceSPerKm: real('avg_pace_s_per_km'),
  avgHr: integer('avg_hr'),
  maxHr: integer('max_hr'),
  caloriesBurned: integer('calories_burned'),
  elevationM: real('elevation_m'),
  rawJson: text('raw_json').notNull(),
})

export const dailyWellness = pgTable('daily_wellness', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  date: date('date').notNull(),
  source: wellnessSourceEnum('source').notNull().default('intervals_icu'),
  steps: integer('steps'),
  restingHr: integer('resting_hr'),
  hrvRmssd: real('hrv_rmssd'),
  sleepScore: integer('sleep_score'),
  sleepQuality: integer('sleep_quality'),
  sleepDurationS: integer('sleep_duration_s'),
  weight: real('weight'),
  vo2max: real('vo2max'),
  caloriesBurned: integer('calories_burned'),
})

export const foods = pgTable('foods', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  brand: text('brand'),
  barcode: text('barcode'),
  calories: real('calories'),
  proteinG: real('protein_g'),
  carbsG: real('carbs_g'),
  fatG: real('fat_g'),
  fibreG: real('fibre_g'),
  sugarG: real('sugar_g'),
  satFatG: real('sat_fat_g'),
  polyFatG: real('poly_fat_g'),
  monoFatG: real('mono_fat_g'),
  transFatG: real('trans_fat_g'),
  cholesterolMg: real('cholesterol_mg'),
  sodiumMg: real('sodium_mg'),
  potassiumMg: real('potassium_mg'),
  calciumMg: real('calcium_mg'),
  ironMg: real('iron_mg'),
  vitaminAPct: real('vitamin_a_pct'),
  vitaminCPct: real('vitamin_c_pct'),
  servingUnit: servingUnitEnum('serving_unit').notNull().default('g'),
  servingDescription: text('serving_description'),
  servingSizeG: real('serving_size_g').notNull(),
  source: foodSourceEnum('source').notNull().default('manual'),
  verifiedByUser: boolean('verified_by_user').notNull().default(false),
})

export const nutritionLog = pgTable('nutrition_log', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  foodId: uuid('food_id').references(() => foods.id).notNull(),
  loggedAt: date('logged_at').notNull(),
  quantityG: real('quantity_g').notNull(),
  calories: real('calories'),
  proteinG: real('protein_g'),
  carbsG: real('carbs_g'),
  fatG: real('fat_g'),
  fibreG: real('fibre_g'),
  sugarG: real('sugar_g'),
  satFatG: real('sat_fat_g'),
  polyFatG: real('poly_fat_g'),
  monoFatG: real('mono_fat_g'),
  transFatG: real('trans_fat_g'),
  cholesterolMg: real('cholesterol_mg'),
  sodiumMg: real('sodium_mg'),
  potassiumMg: real('potassium_mg'),
  calciumMg: real('calcium_mg'),
  ironMg: real('iron_mg'),
  vitaminAPct: real('vitamin_a_pct'),
  vitaminCPct: real('vitamin_c_pct'),
})

export type User = typeof users.$inferSelect
export type Activity = typeof activities.$inferSelect
export type NewActivity = typeof activities.$inferInsert
export type DailyWellness = typeof dailyWellness.$inferSelect
export type NewDailyWellness = typeof dailyWellness.$inferInsert
