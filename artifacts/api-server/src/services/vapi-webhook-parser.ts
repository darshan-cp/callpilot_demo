import type { LeadCallStatus } from "./call-provider/types.js";

type StructuredOutput = {
  name?: string;
  result?: unknown;
};

export type ParsedVapiEndOfCallReport = {
  eventType: string;
  externalCallId: string;
  customerPhone: string;
  customerName: string | null;
  endedReason: string;
  callDuration: number | null;
  callCost: number | null;
  transcript: string;
  recordingUrl: string | null;
  status: LeadCallStatus;
  humanDetected: boolean;
  callSummary: string;
  confidenceScore: number | null;
  aiClassification: string;
  appointmentBooked: boolean;
  appointmentDate: string | null;
  appointmentTime: string | null;
  verifiedName: string | null;
  verifiedCompany: string | null;
};

function normalizePhoneDigits(phone: string): string {
  return phone.replace(/\D/g, "");
}

/** Match US/international numbers stored with or without country code */
export function phonesMatch(stored: string, incoming: string): boolean {
  const a = normalizePhoneDigits(stored);
  const b = normalizePhoneDigits(incoming);
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.endsWith(b) || b.endsWith(a)) return true;
  if (a.length >= 10 && b.length >= 10 && a.slice(-10) === b.slice(-10)) return true;
  return false;
}

function isVoicemailTranscript(transcript: string): boolean {
  const lower = transcript.toLowerCase();
  return (
    lower.includes("voice mail") ||
    lower.includes("voicemail") ||
    lower.includes("forwarded to") ||
    lower.includes("not available to take your call") ||
    lower.includes("at the tone, please record")
  );
}

type ContactVerificationResult = {
  nameMatch: boolean | null;
  companyMatch: boolean | null;
  verificationSuccess: boolean | null;
  verificationStatus: string | null;
  verifiedName: string | null;
  verifiedCompany: string | null;
  agentSpoke: boolean | null;
  callDurationSeconds: number | null;
};

function parseStructuredOutputs(
  structuredOutputs: Record<string, StructuredOutput>,
): {
  humanDetected: boolean | null;
  bookingSummary: string;
  appointmentBooked: boolean;
  appointmentDate: string | null;
  appointmentTime: string | null;
  contactVerification: ContactVerificationResult | null;
} {
  let humanDetected: boolean | null = null;
  let bookingSummary = "";
  let appointmentBooked = false;
  let appointmentDate: string | null = null;
  let appointmentTime: string | null = null;
  let contactVerification: ContactVerificationResult | null = null;

  for (const output of Object.values(structuredOutputs)) {
    if (output?.name === "human_detected") {
      humanDetected = Boolean(output.result);
    }
    if (output?.name === "booking_made" && output.result && typeof output.result === "object") {
      const booking = output.result as {
        summary?: string;
        appointmentBooked?: boolean;
        appointmentDate?: string;
        appointmentTime?: string;
      };
      bookingSummary = booking.summary ?? "";
      appointmentBooked = Boolean(booking.appointmentBooked);
      appointmentDate =
        booking.appointmentDate && booking.appointmentDate !== "null"
          ? booking.appointmentDate
          : null;
      appointmentTime =
        booking.appointmentTime && booking.appointmentTime !== "null"
          ? booking.appointmentTime
          : null;
    }
    if (output?.name === "contact_verification" && output.result && typeof output.result === "object") {
      const verification = output.result as {
        name_match?: boolean;
        company_match?: boolean;
        verification_success?: boolean;
        verification_status?: string;
        verified_name?: string;
        verified_company?: string;
        agent_spoke?: boolean;
        call_duration_seconds?: number;
      };
      contactVerification = {
        nameMatch: typeof verification.name_match === "boolean" ? verification.name_match : null,
        companyMatch:
          typeof verification.company_match === "boolean" ? verification.company_match : null,
        verificationSuccess:
          typeof verification.verification_success === "boolean"
            ? verification.verification_success
            : null,
        verificationStatus: verification.verification_status ?? null,
        verifiedName: verification.verified_name ?? null,
        verifiedCompany: verification.verified_company ?? null,
        agentSpoke: typeof verification.agent_spoke === "boolean" ? verification.agent_spoke : null,
        callDurationSeconds:
          typeof verification.call_duration_seconds === "number"
            ? verification.call_duration_seconds
            : null,
      };
    }
  }

  return {
    humanDetected,
    bookingSummary,
    appointmentBooked,
    appointmentDate,
    appointmentTime,
    contactVerification,
  };
}

function buildVerificationSummary(contactVerification: ContactVerificationResult): string {
  const name = contactVerification.verifiedName ?? "Unknown contact";
  const company = contactVerification.verifiedCompany ?? "unknown company";

  if (contactVerification.verificationSuccess) {
    return `Contact verified: ${name} at ${company}.`;
  }
  if (contactVerification.nameMatch === false) {
    return `Wrong contact: caller is not ${name}.`;
  }
  if (contactVerification.companyMatch === false) {
    return `Company mismatch: caller confirmed as ${name} but not associated with ${company}.`;
  }
  if (contactVerification.verificationStatus) {
    return `Verification ${contactVerification.verificationStatus.replace(/_/g, " ")}.`;
  }
  return "Contact verification could not be completed.";
}

function resolveCallOutcome(input: {
  humanDetected: boolean;
  endedReason: string;
  transcript: string;
  appointmentBooked: boolean;
  bookingSummary: string;
  contactVerification: ContactVerificationResult | null;
}): {
  status: LeadCallStatus;
  humanDetected: boolean;
  callSummary: string;
  confidenceScore: number | null;
  aiClassification: string;
} {
  const { humanDetected, endedReason, transcript, appointmentBooked, bookingSummary, contactVerification } =
    input;

  if (appointmentBooked) {
    return {
      status: "verified",
      humanDetected: true,
      callSummary: bookingSummary || "Appointment booked during the call.",
      confidenceScore: 0.97,
      aiClassification: "Verified",
    };
  }

  const voicemailLike =
    !humanDetected || endedReason.includes("silence") || isVoicemailTranscript(transcript);

  if (voicemailLike) {
    const defaultVoicemailSummary = "The call went to voicemail or no live person was detected.";
    return {
      status: "voicemail",
      humanDetected: false,
      callSummary:
        bookingSummary ||
        (contactVerification?.verificationStatus === "no_answer" && contactVerification
          ? buildVerificationSummary(contactVerification)
          : defaultVoicemailSummary),
      confidenceScore: 0.9,
      aiClassification: "Voicemail",
    };
  }

  if (contactVerification) {
    if (contactVerification.verificationSuccess) {
      return {
        status: "verified",
        humanDetected: true,
        callSummary: buildVerificationSummary(contactVerification),
        confidenceScore: 0.95,
        aiClassification: "Verified",
      };
    }
    if (contactVerification.nameMatch === false) {
      return {
        status: "wrong_contact",
        humanDetected: true,
        callSummary: buildVerificationSummary(contactVerification),
        confidenceScore: 0.88,
        aiClassification: "Wrong Contact",
      };
    }
    if (contactVerification.companyMatch === false) {
      return {
        status: "company_mismatch",
        humanDetected: true,
        callSummary: buildVerificationSummary(contactVerification),
        confidenceScore: 0.86,
        aiClassification: "Company Mismatch",
      };
    }
  }

  return {
    status: "verified",
    humanDetected: true,
    callSummary: bookingSummary || "Live person detected on the call.",
    confidenceScore: 0.92,
    aiClassification: "Verified",
  };
}

export function parseVapiEndOfCallReport(body: Record<string, unknown>): ParsedVapiEndOfCallReport | null {
  const message = (body.message ?? body) as Record<string, unknown>;
  const eventType = String(message.type ?? "unknown");
  const artifact = (message.artifact ?? {}) as Record<string, unknown>;

  const callFromMessage = message.call as { id?: string } | undefined;
  const callFromArtifact = (artifact.variables as { call?: { id?: string } } | undefined)?.call;
  const externalCallId = callFromMessage?.id ?? callFromArtifact?.id ?? (body.callId as string) ?? "";

  if (!externalCallId) return null;

  const customer =
    (message.customer as { number?: string; name?: string } | undefined) ??
    (callFromMessage as { customer?: { number?: string; name?: string } } | undefined)?.customer ??
    ((artifact.variables as { customer?: { number?: string; name?: string } } | undefined)?.customer);

  const customerPhone = customer?.number ?? "";
  if (!customerPhone) return null;

  const structuredOutputs = (artifact.structuredOutputs ?? {}) as Record<string, StructuredOutput>;
  const {
    humanDetected: structuredHuman,
    bookingSummary,
    appointmentBooked,
    appointmentDate,
    appointmentTime,
    contactVerification,
  } = parseStructuredOutputs(structuredOutputs);

  const endedReason = String(message.endedReason ?? artifact.endedReason ?? "unknown");
  const transcript = String(message.transcript ?? artifact.transcript ?? "");
  const recordingUrl =
    (message.recordingUrl as string | undefined) ??
    (artifact.recordingUrl as string | undefined) ??
    null;

  const durationRaw =
    message.durationSeconds ??
    message.durationMs ??
    contactVerification?.callDurationSeconds;
  const callDuration =
    typeof durationRaw === "number"
      ? Math.round(durationRaw > 1000 ? durationRaw / 1000 : durationRaw)
      : null;

  const callCost = typeof message.cost === "number" ? message.cost : null;

  let humanDetected = structuredHuman ?? false;
  if (structuredHuman === null) {
    if (endedReason.includes("silence") || isVoicemailTranscript(transcript)) {
      humanDetected = false;
    } else if (endedReason.includes("customer") || endedReason.includes("assistant")) {
      humanDetected = true;
    }
  }

  const outcome = resolveCallOutcome({
    humanDetected,
    endedReason,
    transcript,
    appointmentBooked,
    bookingSummary,
    contactVerification,
  });
  const { status, callSummary, confidenceScore, aiClassification } = outcome;
  humanDetected = outcome.humanDetected;

  return {
    eventType,
    externalCallId,
    customerPhone,
    customerName: customer?.name ?? null,
    endedReason,
    callDuration,
    callCost,
    transcript: transcript || callSummary,
    recordingUrl,
    status,
    humanDetected,
    callSummary,
    confidenceScore,
    aiClassification,
    appointmentBooked,
    appointmentDate,
    appointmentTime,
    verifiedName: contactVerification?.verifiedName ?? null,
    verifiedCompany: contactVerification?.verifiedCompany ?? null,
  };
}
