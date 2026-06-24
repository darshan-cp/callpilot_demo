import { z } from "zod";

export const RETRY_TYPES = ["fixed_delay", "custom_schedule", "smart_schedule"] as const;
export type RetryType = (typeof RETRY_TYPES)[number];

export const FREQUENCY_OPTIONS = [
  "same_day",
  "next_day",
  "alternate_day",
  "every_x_days",
  "weekly",
  "monthly",
  "custom_cron",
] as const;
export type FrequencyOption = (typeof FREQUENCY_OPTIONS)[number];

export const TIME_PREFERENCES = [
  "same_time",
  "random_in_window",
  "fixed_time",
  "different_time",
  "ai_predicted",
] as const;
export type TimePreference = (typeof TIME_PREFERENCES)[number];

export const TIME_RULES = [
  "same_day",
  "next_day",
  "same_time",
  "different_time",
  "business_hours_only",
] as const;
export type TimeRule = (typeof TIME_RULES)[number];

export const DELAY_UNITS = ["minutes", "hours", "days", "weeks"] as const;
export type DelayUnit = (typeof DELAY_UNITS)[number];

/** Simplified units shown in the UI — hours, days, weeks only. */
export const SIMPLE_DELAY_UNITS = ["hours", "days", "weeks"] as const;
export type SimpleDelayUnit = (typeof SIMPLE_DELAY_UNITS)[number];

export interface RetryScheduleContext {
  startTime: string;
  endTime: string;
  allowedDays: number[];
}

export const STOP_CONDITIONS = [
  "answered",
  "callback_requested",
  "voicemail_detected",
  "dnc",
  "max_attempts",
  "lead_status_changed",
] as const;
export type StopCondition = (typeof STOP_CONDITIONS)[number];

export const retryRuleSchema = z.object({
  id: z.string(),
  delayValue: z.number().min(1),
  delayUnit: z.enum(DELAY_UNITS),
  timeRule: z.enum(TIME_RULES),
  fixedTime: z.string().optional(),
  timeOffsetHours: z.number().optional(),
});

export const retryStrategySchema = z.object({
  retryType: z.enum(RETRY_TYPES),
  maxAttempts: z.number().min(1).max(20),
  businessDaysOnly: z.boolean(),
  timeRotation: z.boolean(),
  schedule: z.array(retryRuleSchema).min(1),
  frequency: z.enum(FREQUENCY_OPTIONS),
  frequencyDays: z.number().min(1).max(365).optional(),
  cronExpression: z.string().optional(),
  timePreference: z.enum(TIME_PREFERENCES),
  fixedRetryTime: z.string().optional(),
  allowedDays: z.array(z.number().min(0).max(6)).min(1),
  stopConditions: z.array(z.enum(STOP_CONDITIONS)).min(1),
});

export type RetryRule = z.infer<typeof retryRuleSchema>;
export type RetryStrategy = z.infer<typeof retryStrategySchema>;

const DEFAULT_SCHEDULE: RetryRule[] = [
  { id: "1", delayValue: 2, delayUnit: "hours", timeRule: "business_hours_only" },
  { id: "2", delayValue: 4, delayUnit: "hours", timeRule: "business_hours_only" },
  { id: "3", delayValue: 1, delayUnit: "days", timeRule: "business_hours_only" },
  { id: "4", delayValue: 2, delayUnit: "days", timeRule: "business_hours_only" },
  { id: "5", delayValue: 1, delayUnit: "weeks", timeRule: "business_hours_only" },
];

export const DEFAULT_RETRY_STRATEGY: RetryStrategy = {
  retryType: "custom_schedule",
  maxAttempts: 5,
  businessDaysOnly: true,
  timeRotation: false,
  schedule: DEFAULT_SCHEDULE,
  frequency: "same_day",
  timePreference: "same_time",
  allowedDays: [1, 2, 3, 4, 5],
  stopConditions: ["answered", "callback_requested", "voicemail_detected", "dnc", "max_attempts"],
};

export const RETRY_PRESETS: Record<string, { label: string; strategy: RetryStrategy }> = {
  aggressive: {
    label: "Aggressive Sales",
    strategy: {
      retryType: "custom_schedule",
      maxAttempts: 5,
      businessDaysOnly: false,
      timeRotation: true,
      schedule: [
        { id: "1", delayValue: 1, delayUnit: "hours", timeRule: "same_day" },
        { id: "2", delayValue: 6, delayUnit: "hours", timeRule: "same_day" },
        { id: "3", delayValue: 1, delayUnit: "days", timeRule: "same_time" },
        { id: "4", delayValue: 1, delayUnit: "days", timeRule: "different_time", timeOffsetHours: 4 },
      ],
      frequency: "same_day",
      timePreference: "different_time",
      allowedDays: [1, 2, 3, 4, 5, 6, 0],
      stopConditions: ["answered", "dnc", "max_attempts"],
    },
  },
  alternateDay: {
    label: "Alternate Day",
    strategy: {
      retryType: "fixed_delay",
      maxAttempts: 6,
      businessDaysOnly: true,
      timeRotation: false,
      schedule: [{ id: "1", delayValue: 2, delayUnit: "days", timeRule: "same_time" }],
      frequency: "alternate_day",
      frequencyDays: 2,
      timePreference: "same_time",
      allowedDays: [1, 2, 3, 4, 5],
      stopConditions: ["answered", "voicemail_detected", "dnc", "max_attempts"],
    },
  },
  weekly: {
    label: "Weekly Follow-up",
    strategy: {
      retryType: "fixed_delay",
      maxAttempts: 4,
      businessDaysOnly: true,
      timeRotation: false,
      schedule: [{ id: "1", delayValue: 1, delayUnit: "weeks", timeRule: "same_time", fixedTime: "10:00" }],
      frequency: "weekly",
      timePreference: "fixed_time",
      fixedRetryTime: "10:00",
      allowedDays: [1],
      stopConditions: ["answered", "callback_requested", "dnc", "max_attempts"],
    },
  },
  timeRotation: {
    label: "Smart Time Rotation",
    strategy: {
      retryType: "smart_schedule",
      maxAttempts: 4,
      businessDaysOnly: true,
      timeRotation: true,
      schedule: [
        { id: "1", delayValue: 4, delayUnit: "hours", timeRule: "different_time", timeOffsetHours: 4 },
        { id: "2", delayValue: 4, delayUnit: "hours", timeRule: "different_time", timeOffsetHours: 4 },
        { id: "3", delayValue: 1, delayUnit: "days", timeRule: "different_time", timeOffsetHours: 1 },
        { id: "4", delayValue: 1, delayUnit: "days", timeRule: "different_time", timeOffsetHours: 5 },
      ],
      frequency: "next_day",
      timePreference: "different_time",
      allowedDays: [1, 2, 3, 4, 5],
      stopConditions: ["answered", "voicemail_detected", "dnc", "max_attempts", "lead_status_changed"],
    },
  },
};

let ruleIdCounter = 0;
export function createRetryRule(attempt = 1): RetryRule {
  ruleIdCounter += 1;
  return {
    id: `retry-${Date.now()}-${ruleIdCounter}`,
    delayValue: attempt === 1 ? 2 : attempt === 2 ? 4 : 1,
    delayUnit: attempt <= 2 ? "hours" : attempt === 3 ? "days" : "weeks",
    timeRule: "business_hours_only",
  };
}

export function delayToSeconds(rule: RetryRule): number {
  const multipliers: Record<DelayUnit, number> = {
    minutes: 60,
    hours: 3600,
    days: 86400,
    weeks: 604800,
  };
  return rule.delayValue * multipliers[rule.delayUnit];
}

/** Sync legacy retryAttempts/retryDelay from strategy for backward-compatible scheduler. */
export function strategyToLegacyFields(strategy: RetryStrategy): {
  retryAttempts: number;
  retryDelay: number;
} {
  const scheduleLen = strategy.schedule.length;
  const retryAttempts = Math.max(0, Math.min(strategy.maxAttempts - 1, scheduleLen));
  const retryDelay = strategy.schedule[0] ? delayToSeconds(strategy.schedule[0]) : 30;
  return { retryAttempts, retryDelay };
}

export function legacyToStrategy(retryAttempts: number, retryDelay: number): RetryStrategy {
  const attempts = Math.max(1, retryAttempts + 1);
  const delayMinutes = Math.max(1, Math.round(retryDelay / 60));
  return {
    ...DEFAULT_RETRY_STRATEGY,
    maxAttempts: attempts,
    schedule: Array.from({ length: attempts }, (_, i) => ({
      id: String(i + 1),
      delayValue: i === 0 ? delayMinutes : delayMinutes * (i + 1),
      delayUnit: "minutes" as const,
      timeRule: "same_day" as const,
    })),
  };
}

export function formatDelay(rule: RetryRule): string {
  const unit = rule.delayValue === 1 ? rule.delayUnit.replace(/s$/, "") : rule.delayUnit;
  return `+${rule.delayValue} ${unit}`;
}

export function formatTimeRule(rule: RetryRule): string {
  const labels: Record<TimeRule, string> = {
    same_day: "Same day",
    next_day: "Next day",
    same_time: "Same time",
    different_time: rule.timeOffsetHours ? `Different time (+${rule.timeOffsetHours} hrs)` : "Different time",
    business_hours_only: "Within calling hours",
  };
  return labels[rule.timeRule];
}

function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + (m || 0);
}

function minutesToTimeString(minutes: number): string {
  const normalized = ((minutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function formatTime12h(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

function countAllowedDaysForward(fromDay: number, count: number, allowedDays: number[]): number {
  let current = fromDay;
  let found = 0;
  let daysPassed = 0;
  while (found < count) {
    daysPassed += 1;
    current = (current + 1) % 7;
    if (allowedDays.includes(current)) found += 1;
  }
  return daysPassed;
}

function countAllowedDayOffset(fromDay: number, calendarDays: number, allowedDays: number[]): number {
  let daysPassed = 0;
  let current = fromDay;
  while (daysPassed < calendarDays) {
    daysPassed += 1;
    current = (current + 1) % 7;
  }
  if (allowedDays.includes(current)) return calendarDays;
  let extra = 0;
  while (!allowedDays.includes((fromDay + calendarDays + extra) % 7)) {
    extra += 1;
  }
  return calendarDays + extra;
}

export interface CalculatedRetryTime {
  time: string;
  dayOffset: number;
  carriesOver: boolean;
}

function targetDay(lastAttemptDay: number, dayOffset: number): number {
  return (lastAttemptDay + dayOffset) % 7;
}

function finalizeRetryTime(
  ctx: RetryScheduleContext,
  timeMinutes: number,
  dayOffset: number,
  lastAttemptDay: number,
  offsetHours = 0,
): CalculatedRetryTime {
  const startMin = parseTimeToMinutes(ctx.startTime);
  const endMin = parseTimeToMinutes(ctx.endTime);
  const windowSize = endMin - startMin;

  let minutes = timeMinutes + offsetHours * 60;
  let days = dayOffset;
  let carriesOver = dayOffset > 0;

  while (minutes >= 24 * 60) {
    minutes -= 24 * 60;
    days += countAllowedDaysForward(targetDay(lastAttemptDay, days), 1, ctx.allowedDays);
    carriesOver = true;
  }

  while (minutes < 0) {
    minutes += 24 * 60;
    if (days > 0) {
      days -= 1;
      carriesOver = true;
    }
  }

  if (minutes < startMin) {
    minutes = startMin;
  }

  if (minutes > endMin && windowSize > 0) {
    const overflow = minutes - endMin;
    const fullWindowDays = Math.floor(overflow / windowSize);
    const remainder = overflow % windowSize;

    if (fullWindowDays > 0) {
      days += countAllowedDaysForward(targetDay(lastAttemptDay, days), fullWindowDays, ctx.allowedDays);
      carriesOver = true;
    }

    if (remainder > 0) {
      days += countAllowedDaysForward(targetDay(lastAttemptDay, days), 1, ctx.allowedDays);
      minutes = startMin + remainder;
      carriesOver = true;
    } else {
      minutes = startMin;
    }
  }

  return { time: minutesToTimeString(minutes), dayOffset: days, carriesOver };
}

/** Calculate when a retry fires, respecting start/end times and allowed days. */
export function calculateRetryTime(
  ctx: RetryScheduleContext,
  rule: RetryRule,
  lastAttemptMinutes: number,
  lastAttemptDay = 1,
): CalculatedRetryTime {
  const startMin = parseTimeToMinutes(ctx.startTime);
  const endMin = parseTimeToMinutes(ctx.endTime);
  const offsetHours = rule.timeOffsetHours ?? 0;

  if (rule.delayUnit === "hours" || rule.delayUnit === "minutes") {
    const delayMinutes = rule.delayUnit === "hours" ? rule.delayValue * 60 : rule.delayValue;
    const resultMinutes = lastAttemptMinutes + delayMinutes;

    if (resultMinutes <= endMin && lastAttemptMinutes >= startMin) {
      return finalizeRetryTime(ctx, resultMinutes, 0, lastAttemptDay, offsetHours);
    }

    const usableToday = Math.max(0, endMin - lastAttemptMinutes);
    const remaining = delayMinutes - usableToday;
    const nextDayTime = startMin + remaining;
    const dayOffset = countAllowedDaysForward(lastAttemptDay, 1, ctx.allowedDays);

    return finalizeRetryTime(ctx, nextDayTime, dayOffset, lastAttemptDay, offsetHours);
  }

  if (rule.delayUnit === "days") {
    const dayOffset = countAllowedDaysForward(lastAttemptDay, rule.delayValue, ctx.allowedDays);
    return finalizeRetryTime(ctx, lastAttemptMinutes, dayOffset, lastAttemptDay, offsetHours);
  }

  const calendarDays = rule.delayValue * 7;
  const dayOffset = countAllowedDayOffset(lastAttemptDay, calendarDays, ctx.allowedDays);
  return finalizeRetryTime(ctx, lastAttemptMinutes, dayOffset, lastAttemptDay, offsetHours);
}

function formatOffsetLabel(offsetHours: number): string {
  if (offsetHours > 0) return ` (+${offsetHours} hrs)`;
  if (offsetHours < 0) return ` (${offsetHours} hrs)`;
  return "";
}

/** Human-readable preview for a retry rule using an example last-call time. */
export function formatRetryPreview(
  ctx: RetryScheduleContext,
  rule: RetryRule,
  exampleLastCallTime = "16:00",
  exampleDay = 1,
): string {
  const lastMin = parseTimeToMinutes(exampleLastCallTime);
  const result = calculateRetryTime(ctx, rule, lastMin, exampleDay);
  const retryAt = formatTime12h(result.time);
  const offsetLabel = formatOffsetLabel(rule.timeOffsetHours ?? 0);

  if (result.dayOffset === 0) {
    return `e.g. last call at ${formatTime12h(exampleLastCallTime)} → same day at ${retryAt}${offsetLabel}`;
  }

  const dayLabel = result.dayOffset === 1 ? "next working day" : `${result.dayOffset} working days later`;
  return `e.g. last call at ${formatTime12h(exampleLastCallTime)} → ${dayLabel} at ${retryAt}${offsetLabel}`;
}

export function formatStrategySummary(strategy: RetryStrategy): string {
  const delays = strategy.schedule.slice(0, 3).map(formatDelay).join(", ");
  const more = strategy.schedule.length > 3 ? ` +${strategy.schedule.length - 3} more` : "";
  const days = strategy.businessDaysOnly ? " · Mon–Fri" : "";
  return `Max ${strategy.maxAttempts}${days} · ${delays}${more}`;
}

export function parseRetryStrategy(raw: unknown): RetryStrategy {
  const result = retryStrategySchema.safeParse(raw);
  if (result.success) return result.data;
  return DEFAULT_RETRY_STRATEGY;
}
