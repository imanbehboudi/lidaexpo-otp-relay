# Lida Expo OTP Relay

یک رلهٔ سرور-به-سرور کوچک برای درخواست IPPanel لیدا، روی زیرساخت داخل ایران. این سرویس فقط endpoint ثابت IPPanel را دارد و **پراکسی عمومی نیست**.

## قرارداد API

`POST /v1/api/send`

```json
{
  "sending_type": "pattern",
  "from_number": "+983000505",
  "code": "pattern-code",
  "recipients": ["+989121234567"],
  "params": { "OTP": "123456" }
}
```

این درخواست و headerهای `Authorization`، `Content-Type` و `Accept` بدون تغییر به `https://edge.ippanel.com/v1/api/send` فرستاده می‌شوند. پاسخ IPPanel (status، headerها و body) نیز بدون تبدیل بازگردانده می‌شود.

نمونهٔ headerها:

```text
Content-Type: application/json
Authorization: IPPanel token from Cloudflare Worker
Content-Type: application/json
```

- Authorization، شمارهٔ ارسال‌کننده و Pattern Code در همروش یا Git ذخیره نمی‌شوند؛ فقط Worker لیدا آن‌ها را از Secret/Variableهای فعلی خود می‌فرستد.
- مسیر و hostname مقصد در کد رله ثابت است؛ URL یا endpoint دلخواه هرگز پذیرفته نمی‌شود.

## تنظیم همروش

| نام | محل نگهداری |
| --- | --- |
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
