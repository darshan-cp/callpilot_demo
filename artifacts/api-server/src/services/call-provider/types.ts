export type LeadCallStatus =
  | "pending"
  | "calling"
  | "verified"
  | "voicemail"
  | "wrong_contact"
  | "company_mismatch"
  | "invalid_number";

export interface InitiateCallInput {
  leadId: number;
  companyId: number;
  campaignId: number | null;
  customerName: string;
  phoneNumber: string;
  companyName?: string | null;
  service?: string | null;
}

export interface InitiateCallResult {
  externalCallId: string;
  status: "queued" | "in-progress";
}

export interface CallCompletionPayload {
  externalCallId: string;
  leadId: number;
  companyId: number;
  campaignId: number | null;
  status: LeadCallStatus;
  humanDetected: boolean;
  endedReason: string;
  callDuration: number | null;
  callSummary: string;
  transcript: string;
  recordingUrl?: string | null;
  confidenceScore: number | null;
  callCost: number | null;
  aiClassification: string;
}

export interface TelephonyConfig {
  assistantId: string;
  phoneNumberId: string;
  apiKey: string;
}

export interface CallProvider {
  initiateCall(
    input: InitiateCallInput,
    config: TelephonyConfig,
  ): Promise<InitiateCallResult>;
}
