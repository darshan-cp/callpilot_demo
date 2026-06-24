import { useState } from "react";
import {
  type RetryStrategy,
  type RetryRule,
  type RetryType,
  type FrequencyOption,
  type TimePreference,
  type DelayUnit,
  type StopCondition,
  type SimpleDelayUnit,
  RETRY_PRESETS,
  SIMPLE_DELAY_UNITS,
  createRetryRule,
  formatDelay,
  formatStrategySummary,
  formatRetryPreview,
  formatTime12h,
} from "@workspace/retry-strategy";
import { LabelWithHelp } from "@/components/LabelWithHelp";
import { InfoTooltip } from "@/components/InfoTooltip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { HELP } from "@/lib/field-help";
import { ChevronDown, LayoutTemplate, Plus, Trash2, RotateCcw, Info } from "lucide-react";
import { cn } from "@/lib/utils";

const RETRY_TYPE_LABELS: Record<RetryType, string> = {
  fixed_delay: "Fixed Delay",
  custom_schedule: "Custom Schedule",
  smart_schedule: "Smart Schedule",
};

const FREQUENCY_LABELS: Record<FrequencyOption, string> = {
  same_day: "Same Day",
  next_day: "Next Day",
  alternate_day: "Every Alternate Day",
  every_x_days: "Every X Days",
  weekly: "Weekly",
  monthly: "Monthly",
  custom_cron: "Custom Cron Schedule",
};

const TIME_PREFERENCE_LABELS: Record<TimePreference, string> = {
  same_time: "Same time as original call",
  random_in_window: "Random time within campaign window",
  fixed_time: "Fixed time",
  different_time: "Different time than previous attempt",
  ai_predicted: "Best AI Predicted Time",
};

const STOP_CONDITION_LABELS: Record<StopCondition, string> = {
  answered: "Customer answered",
  callback_requested: "Customer requested callback",
  voicemail_detected: "Voicemail detected",
  dnc: "DNC (Do Not Call)",
  max_attempts: "Maximum attempts reached",
  lead_status_changed: "Lead status changed",
};

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const BUSINESS_DAYS = [1, 2, 3, 4, 5];
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

const UNIT_LABELS: Record<SimpleDelayUnit, string> = {
  hours: "Hours",
  days: "Days",
  weeks: "Weeks",
};

function isBusinessDaysOnly(days: number[]) {
  return days.length === BUSINESS_DAYS.length && BUSINESS_DAYS.every((day) => days.includes(day));
}

interface RetryStrategyBuilderProps {
  value: RetryStrategy;
  onChange: (strategy: RetryStrategy) => void;
  startTime: string;
  endTime: string;
}

export function RetryStrategyBuilder({ value, onChange, startTime, endTime }: RetryStrategyBuilderProps) {
  const [open, setOpen] = useState(true);
  const [presetsOpen, setPresetsOpen] = useState(false);

  const scheduleContext = {
    startTime,
    endTime,
    allowedDays: value.allowedDays,
  };

  const update = (patch: Partial<RetryStrategy>) => onChange({ ...value, ...patch });

  const updateRule = (id: string, patch: Partial<RetryRule>) => {
    update({
      schedule: value.schedule.map((rule) =>
        rule.id === id ? { ...rule, ...patch, timeRule: "business_hours_only" as const } : rule,
      ),
    });
  };

  const addRule = () => {
    const next = createRetryRule(value.schedule.length + 1);
    update({
      schedule: [...value.schedule, next],
      maxAttempts: Math.max(value.maxAttempts, value.schedule.length + 1),
    });
  };

  const removeRule = (id: string) => {
    if (value.schedule.length <= 1) return;
    update({ schedule: value.schedule.filter((rule) => rule.id !== id) });
  };

  const toggleDay = (day: number) => {
    const allowed = value.allowedDays.includes(day)
      ? value.allowedDays.filter((d) => d !== day)
      : [...value.allowedDays, day].sort((a, b) => a - b);
    if (allowed.length === 0) return;
    update({ allowedDays: allowed, businessDaysOnly: isBusinessDaysOnly(allowed) });
  };

  const toggleStopCondition = (condition: StopCondition) => {
    const next = value.stopConditions.includes(condition)
      ? value.stopConditions.filter((c) => c !== condition)
      : [...value.stopConditions, condition];
    if (next.length === 0) return;
    update({ stopConditions: next });
  };

  const applyPreset = (key: string) => {
    const preset = RETRY_PRESETS[key];
    if (preset) onChange({ ...preset.strategy });
  };

  const showScheduleBuilder = value.retryType !== "fixed_delay" || value.schedule.length > 1;

  const renderDelayRow = (rule: RetryRule, index: number, showDelete: boolean) => (
    <div
      key={rule.id}
      className="grid grid-cols-[auto_1fr_auto] gap-2 items-start px-3 py-2.5 border-t border-border text-sm"
    >
      <span className="text-xs font-medium text-muted-foreground w-14 pt-2">
        Retry {index + 1}
      </span>
      <div className="space-y-1.5">
        <div className="flex flex-wrap gap-1.5 items-center">
          <Input
            type="number"
            min={1}
            className="h-8 w-16"
            value={rule.delayValue}
            onChange={(e) => updateRule(rule.id, { delayValue: Number(e.target.value) })}
          />
          <Select
            value={SIMPLE_DELAY_UNITS.includes(rule.delayUnit as SimpleDelayUnit) ? rule.delayUnit : "hours"}
            onValueChange={(v) => updateRule(rule.id, { delayUnit: v as DelayUnit })}
          >
            <SelectTrigger className="h-8 w-24"><SelectValue /></SelectTrigger>
            <SelectContent>
              {SIMPLE_DELAY_UNITS.map((u) => (
                <SelectItem key={u} value={u}>{UNIT_LABELS[u]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-muted-foreground whitespace-nowrap">± hrs</span>
            <Input
              type="number"
              min={-12}
              max={12}
              className="h-8 w-14 text-xs"
              placeholder="0"
              value={rule.timeOffsetHours ?? ""}
              onChange={(e) => {
                const raw = e.target.value;
                updateRule(rule.id, {
                  timeOffsetHours: raw === "" ? undefined : Number(raw),
                });
              }}
            />
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground leading-snug">
          {formatRetryPreview(scheduleContext, rule)}
        </p>
      </div>
      {showDelete ? (
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          disabled={value.schedule.length <= 1}
          onClick={() => removeRule(rule.id)}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      ) : (
        <span />
      )}
    </div>
  );

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-xl border border-border bg-muted/20">
      <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 p-4 text-left hover:bg-muted/30 transition-colors rounded-xl">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">Retry Strategy</span>
            <InfoTooltip content={HELP.retryStrategy} />
          </div>
          <p className="text-xs text-muted-foreground truncate">{formatStrategySummary(value)}</p>
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            <Badge variant="secondary" className="text-[10px] font-normal">
              Max {value.maxAttempts}
            </Badge>
            {value.businessDaysOnly && (
              <Badge variant="secondary" className="text-[10px] font-normal">Business days</Badge>
            )}
            {value.schedule.slice(0, 4).map((rule, i) => (
              <Badge key={rule.id} variant="outline" className="text-[10px] font-normal">
                {i + 1}: {formatDelay(rule)}
              </Badge>
            ))}
          </div>
        </div>
        <ChevronDown className={cn("w-4 h-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </CollapsibleTrigger>

      <CollapsibleContent className="px-4 pb-4 space-y-5 border-t border-border">
        <div className="pt-4 flex justify-end">
          <Popover open={presetsOpen} onOpenChange={setPresetsOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 gap-1.5 text-xs text-muted-foreground"
                title="Example retry patterns"
              >
                <LayoutTemplate className="w-3.5 h-3.5" />
                Example Patterns
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-auto p-3">
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Choose a pattern</p>
                <div className="flex flex-wrap gap-2 max-w-xs">
                  {Object.entries(RETRY_PRESETS).map(([key, preset]) => (
                    <Button
                      key={key}
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => {
                        applyPreset(key);
                        setPresetsOpen(false);
                      }}
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <LabelWithHelp help={HELP.retryType}>Retry Type</LabelWithHelp>
            <Select value={value.retryType} onValueChange={(v) => update({ retryType: v as RetryType })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(RETRY_TYPE_LABELS).map(([k, label]) => (
                  <SelectItem key={k} value={k}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <LabelWithHelp help={HELP.maxAttempts}>Max Attempts</LabelWithHelp>
            <Input
              type="number"
              min={1}
              max={20}
              value={value.maxAttempts}
              onChange={(e) => update({ maxAttempts: Number(e.target.value) })}
            />
          </div>
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <Switch
            checked={value.businessDaysOnly}
            onCheckedChange={(enabled) =>
              update({
                businessDaysOnly: enabled,
                allowedDays: enabled ? BUSINESS_DAYS : ALL_DAYS,
              })
            }
          />
          <span className="text-sm">Business Days Only</span>
        </label>

        {showScheduleBuilder && (
          <div className="space-y-2">
            <LabelWithHelp help={HELP.retrySchedule}>Retry Schedule</LabelWithHelp>

            <div className="flex gap-2 rounded-lg bg-primary/5 border border-primary/10 px-3 py-2.5 text-xs text-muted-foreground">
              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-primary" />
              <p>
                Retries respect your calling window ({formatTime12h(startTime)} – {formatTime12h(endTime)}).
                Hours add to the last call time; days keep the same time on the next working day (min. 24 hrs).
                Use ± hrs to shift the retry earlier or later. Overflow past end time carries to the next working day.
              </p>
            </div>

            <div className="rounded-lg border border-border overflow-hidden">
              <div className="grid grid-cols-[auto_1fr_auto] gap-2 bg-muted/50 px-3 py-2 text-[11px] font-medium text-muted-foreground">
                <span>Attempt</span>
                <span>Wait After Previous Call</span>
                <span />
              </div>
              {value.schedule.map((rule, index) => renderDelayRow(rule, index, true))}
            </div>
            <Button type="button" size="sm" variant="outline" className="h-8 gap-1.5" onClick={addRule}>
              <Plus className="w-3.5 h-3.5" /> Add Retry
            </Button>
          </div>
        )}

        {value.retryType === "fixed_delay" && value.schedule.length === 1 && (
          <div className="space-y-2">
            <LabelWithHelp help={HELP.retryDelay}>Delay Between Retries</LabelWithHelp>
            <div className="flex gap-2 rounded-lg bg-primary/5 border border-primary/10 px-3 py-2.5 text-xs text-muted-foreground">
              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-primary" />
              <p>
                Same calling-window rules apply — delays respect {formatTime12h(startTime)} to {formatTime12h(endTime)} and carry over to the next working day when needed.
              </p>
            </div>
            {renderDelayRow(value.schedule[0], 0, false)}
          </div>
        )}

        {!showScheduleBuilder && (
          <>
            <div className="space-y-2">
              <LabelWithHelp help={HELP.retryFrequency}>When should retries occur?</LabelWithHelp>
              <Select value={value.frequency} onValueChange={(v) => update({ frequency: v as FrequencyOption })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(FREQUENCY_LABELS).map(([k, label]) => (
                    <SelectItem key={k} value={k}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {value.frequency === "every_x_days" && (
                <div className="flex items-center gap-2">
                  <Label className="text-xs shrink-0">Every</Label>
                  <Input
                    type="number"
                    min={1}
                    max={365}
                    className="h-8 w-20"
                    value={value.frequencyDays ?? 2}
                    onChange={(e) => update({ frequencyDays: Number(e.target.value) })}
                  />
                  <span className="text-xs text-muted-foreground">days</span>
                </div>
              )}
              {value.frequency === "custom_cron" && (
                <Input
                  placeholder="0 10 * * 1-5"
                  value={value.cronExpression ?? ""}
                  onChange={(e) => update({ cronExpression: e.target.value })}
                />
              )}
            </div>

            <div className="space-y-2">
              <LabelWithHelp help={HELP.retryTimePreference}>Retry at</LabelWithHelp>
              <Select
                value={value.timePreference}
                onValueChange={(v) => update({ timePreference: v as TimePreference })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TIME_PREFERENCE_LABELS).map(([k, label]) => (
                    <SelectItem key={k} value={k} disabled={k === "ai_predicted"}>
                      {label}{k === "ai_predicted" ? " (coming soon)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {value.timePreference === "fixed_time" && (
                <Input
                  type="time"
                  value={value.fixedRetryTime ?? "10:00"}
                  onChange={(e) => update({ fixedRetryTime: e.target.value })}
                />
              )}
            </div>
          </>
        )}

        <div className="space-y-2">
          <LabelWithHelp help={HELP.retryDays}>Day Restrictions</LabelWithHelp>
          <div className="flex flex-wrap gap-3">
            {DAY_LABELS.map((label, day) => (
              <label key={day} className="flex items-center gap-1.5 cursor-pointer">
                <Checkbox
                  checked={value.allowedDays.includes(day)}
                  onCheckedChange={() => toggleDay(day)}
                />
                <span className="text-xs">{label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <LabelWithHelp help={HELP.retryStopConditions}>Stop retrying when</LabelWithHelp>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {(Object.entries(STOP_CONDITION_LABELS) as [StopCondition, string][]).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={value.stopConditions.includes(key)}
                  onCheckedChange={() => toggleStopCondition(key)}
                />
                <span className="text-xs">{label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="rounded-lg bg-muted/40 p-3 font-mono text-[11px] text-muted-foreground leading-relaxed">
          <div>Retry Strategy</div>
          <div>├── Max Attempts: {value.maxAttempts}</div>
          <div>├── Calling Window: {formatTime12h(startTime)} – {formatTime12h(endTime)}</div>
          <div>├── Business Days Only: {value.businessDaysOnly ? "Yes" : "No"}</div>
          <div>├── Retry Schedule</div>
          {value.schedule.map((rule) => (
            <div key={rule.id}>│   ├── {formatDelay(rule)} · {formatRetryPreview(scheduleContext, rule)}</div>
          ))}
          <div>└── Stop: {value.stopConditions.slice(0, 2).map((c) => STOP_CONDITION_LABELS[c]).join(", ")}{value.stopConditions.length > 2 ? "…" : ""}</div>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 text-xs gap-1.5 text-muted-foreground"
          onClick={() => onChange({ ...value, schedule: value.schedule.map((r, i) => ({ ...createRetryRule(i + 1), id: r.id })) })}
        >
          <RotateCcw className="w-3 h-3" /> Reset schedule defaults
        </Button>
      </CollapsibleContent>
    </Collapsible>
  );
}
