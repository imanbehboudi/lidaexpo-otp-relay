import type { RelayConfig } from "./config.js";

const ippanelUrl = "https://edge.ippanel.com/v1/api/send";

export type OtpDelivery = {
  recipient: string;
  otp: string;
};

export async function sendIppanelPattern(
  config: RelayConfig,
  delivery: OtpDelivery,
  fetcher: typeof fetch = fetch,
): Promise<boolean> {
  try {
    const response = await fetcher(ippanelUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: config.IPPANEL_AUTHORIZATION,
      },
      body: JSON.stringify({
        sending_type: "pattern",
        from_number: config.IPPANEL_FROM_NUMBER,
        code: config.IPPANEL_PATTERN_CODE,
        recipients: [delivery.recipient],
        params: { OTP: delivery.otp },
      }),
      signal: AbortSignal.timeout(10_000),
    });

    return response.ok;
  } catch {
    return false;
  }
}
