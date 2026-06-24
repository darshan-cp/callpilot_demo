import { randomUUID } from "crypto";
import type {
  CallCompletionPayload,
  InitiateCallInput,
  InitiateCallResult,
  LeadCallStatus,
  TelephonyConfig,
} from "./types.js";

type MockScenario = {
  weight: number;
  status: LeadCallStatus;
  humanDetected: boolean;
  endedReason: string;
  durationSeconds: number;
  callCost: number;
  buildSummary: (input: InitiateCallInput) => string;
  buildTranscript: (input: InitiateCallInput) => string;
  confidenceScore: number | null;
};

const MOCK_SCENARIOS: MockScenario[] = [
  {
    weight: 38,
    status: "voicemail",
    humanDetected: false,
    endedReason: "silence-timed-out",
    durationSeconds: 97,
    callCost: 0.13,
    buildSummary: (input) =>
      `The call went to voicemail. The assistant left a message for ${input.customerName} regarding ${input.service ?? "your inquiry"}.`,
    buildTranscript: (input) =>
      `Agent: "Hello."\nUser: "This call may be recorded for quality assurance. Please hold while I try to connect you."\nAgent: "Thank you. I'll hold."\nUser: "Your call has been forwarded to voicemail. At the tone, please record your message."\nAgent: "Hi. This message is for ${input.customerName}. We're following up regarding ${input.service ?? "your request"}. Please let us know a convenient time for a quick call. Thank you."`,
    confidenceScore: 0.91,
  },
  {
    weight: 22,
    status: "verified",
    humanDetected: true,
    endedReason: "customer-ended-call",
    durationSeconds: 84,
    callCost: 0.11,
    buildSummary: (input) =>
      `${input.customerName} confirmed identity and company. A follow-up call was scheduled.`,
    buildTranscript: (input) =>
      `Agent: "Am I speaking with ${input.customerName}?"\nProspect: "Yes, speaking."\nAgent: "Are you currently working with ${input.service ? "us on " + input.service : "the company we have on file"}?"\nProspect: "Yes, that's correct."\nAgent: "Great — let's schedule a quick follow-up."`,
    confidenceScore: 0.96,
  },
  {
    weight: 15,
    status: "wrong_contact",
    humanDetected: true,
    endedReason: "customer-ended-call",
    durationSeconds: 42,
    callCost: 0.07,
    buildSummary: () => "A person answered but confirmed they are not the intended contact.",
    buildTranscript: (input) =>
      `Agent: "Am I speaking with ${input.customerName}?"\nProspect: "No, you have the wrong number."`,
    confidenceScore: 0.88,
  },
  {
    weight: 12,
    status: "company_mismatch",
    humanDetected: true,
    endedReason: "customer-ended-call",
    durationSeconds: 58,
    callCost: 0.09,
    buildSummary: (input) =>
      `${input.customerName} answered but no longer works at the expected company.`,
    buildTranscript: (input) =>
      `Agent: "Am I speaking with ${input.customerName}?"\nProspect: "Yes."\nAgent: "Are you currently working with the company we have on file?"\nProspect: "No, I work for a different company now."`,
    confidenceScore: 0.85,
  },
  {
    weight: 8,
    status: "voicemail",
    humanDetected: false,
    endedReason: "silence-timed-out",
    durationSeconds: 50,
    callCost: 0.09,
    buildSummary: () => "No answer — silence timeout detected (possible voicemail or no pickup).",
    buildTranscript: () => "[No answer — silence timeout after 30 seconds]",
    confidenceScore: 0.72,
  },
  {
    weight: 5,
    status: "invalid_number",
    humanDetected: false,
    endedReason: "call-start-error",
    durationSeconds: 0,
    callCost: 0.02,
    buildSummary: () => "The number could not be reached — invalid or disconnected.",
    buildTranscript: () => "[Number unreachable — invalid or disconnected]",
    confidenceScore: null,
  },
];

const pendingCompletions = new Map<
  string,
  { input: InitiateCallInput; timeout: ReturnType<typeof setTimeout> }
>();

function pickScenario(): MockScenario {
  const total = MOCK_SCENARIOS.reduce((sum, s) => sum + s.weight, 0);
  let roll = Math.random() * total;
  for (const scenario of MOCK_SCENARIOS) {
    roll -= scenario.weight;
    if (roll <= 0) return scenario;
  }
  return MOCK_SCENARIOS[0];
}

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("+") ? digits : `+${digits.startsWith("1") ? digits : "1" + digits}`;
}

function simulateDelaySeconds(): number {
  return Math.floor(Math.random() * 8) + 5;
}

export type MockCompletionHandler = (payload: CallCompletionPayload) => Promise<void>;

let completionHandler: MockCompletionHandler | null = null;

export function registerMockCompletionHandler(handler: MockCompletionHandler): void {
  completionHandler = handler;
}

export async function initiateMockCall(
  input: InitiateCallInput,
  _config: TelephonyConfig,
): Promise<InitiateCallResult> {
  const externalCallId = randomUUID();
  const delayMs = simulateDelaySeconds() * 1000;

  const timeout = setTimeout(async () => {
    pendingCompletions.delete(externalCallId);
    if (!completionHandler) return;

    const scenario = pickScenario();
    await completionHandler({
      externalCallId,
      leadId: input.leadId,
      companyId: input.companyId,
      campaignId: input.campaignId,
      status: scenario.status,
      humanDetected: scenario.humanDetected,
      endedReason: scenario.endedReason,
      callDuration: scenario.durationSeconds || null,
      callSummary: scenario.buildSummary(input),
      transcript: scenario.buildTranscript(input),
      confidenceScore: scenario.confidenceScore,
      callCost: scenario.callCost,
      aiClassification: scenario.status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    });
  }, delayMs);

  pendingCompletions.set(externalCallId, { input, timeout });

  return {
    externalCallId,
    status: "queued",
  };
}

export function cancelMockCall(externalCallId: string): void {
  const pending = pendingCompletions.get(externalCallId);
  if (pending) {
    clearTimeout(pending.timeout);
    pendingCompletions.delete(externalCallId);
  }
}

export function buildMockInitiateResponse(
  input: InitiateCallInput,
  externalCallId: string,
): Record<string, unknown> {
  return {
    id: externalCallId,
    type: "outboundPhoneCall",
    status: "queued",
    customer: {
      name: input.customerName,
      number: formatPhone(input.phoneNumber),
    },
    assistantOverrides: {
      variableValues: {
        customer_name: input.customerName,
        service: input.service ?? "General Inquiry",
      },
    },
  };
}
