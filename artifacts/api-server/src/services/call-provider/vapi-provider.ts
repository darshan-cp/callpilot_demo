import type {
  InitiateCallInput,
  InitiateCallResult,
  TelephonyConfig,
} from "./types.js";

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (phone.startsWith("+")) return phone;
  return `+${digits.startsWith("1") ? digits : "1" + digits}`;
}

export async function initiateVapiCall(
  input: InitiateCallInput,
  config: TelephonyConfig,
): Promise<InitiateCallResult> {
  const response = await fetch("https://api.vapi.ai/call", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      assistantId: config.assistantId,
      phoneNumberId: config.phoneNumberId,
      customer: {
        number: formatPhone(input.phoneNumber),
        name: input.customerName,
      },
      assistantOverrides: {
        variableValues: {
          customer_name: input.customerName,
          company_name: input.companyName ?? "",
          service: input.service ?? "General Inquiry",
        },
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Telephony API error ${response.status}: ${body}`);
  }

  const data = (await response.json()) as { id: string; status?: string };
  return {
    externalCallId: data.id,
    status: data.status === "in-progress" ? "in-progress" : "queued",
  };
}
