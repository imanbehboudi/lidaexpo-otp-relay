# Lida Expo OTP Relay

یک رلهٔ سرور-به-سرور کوچک برای ارسال OTP لیدا از IPPanel، روی زیرساخت داخل ایران. این سرویس فقط یک درخواست امضاشده از Worker لیدا را می‌پذیرد و **پراکسی عمومی نیست**.

## قرارداد API

`POST /v1/otp/send`

```json
{
  "recipient": "+989121234567",
  "otp": "123456"
}
```

هدرهای لازم:

```text
Content-Type: application/json
X-Lida-Timestamp: Unix timestamp in milliseconds
X-Lida-Signature: base64url HMAC-SHA256(timestamp + "." + raw JSON body)
```

- ساعت درخواست فقط تا ۶۰ ثانیه اختلاف می‌تواند داشته باشد.
- فقط شمارهٔ موبایل ایرانی با قالب E.164 و OTP شش‌رقمی پذیرفته می‌شود.
- Authorization مربوط به IPPanel فقط در Secret محیط همروش است، نه در Git و نه در Cloudflare.
- رله فقط Pattern مشخص IPPanel را فراخوانی می‌کند و URL یا payload دلخواه را عبور نمی‌دهد.

## تنظیم همروش

| نام | محل نگهداری |
| --- | --- |
| `IPPANEL_AUTHORIZATION` | Secret همروش |
| `OTP_RELAY_SIGNING_SECRET` | Secret همروش؛ دقیقاً هم‌ارز Secret در Cloudflare |
| `IPPANEL_FROM_NUMBER` | متغیر عادی همروش |
| `IPPANEL_PATTERN_CODE` | متغیر عادی همروش |
| `PORT` | متغیر عادی، `3000` |

دامنهٔ پیشنهادی سرویس: `otp-relay.lidaexpo.ir`.

## توسعه و بررسی

```bash
npm install
cp .env.example .env
npm run check
npm run build
```

Dockerfile چندمرحله‌ای است و سرویس را با کاربر غیرroot اجرا می‌کند. مسیر `GET /health` برای health check همروش آماده است.
