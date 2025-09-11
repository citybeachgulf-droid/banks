# LinkedIn People Scraper

أداة سطر أوامر لاستخراج الاسم، المنصب، ومعلومة تواصل/وصف من صفحة الأشخاص لشركة على لينكدإن.

تحذير: الوصول الكامل لبيانات الأشخاص على لينكدإن يتطلب تسجيل دخول. يمكنك تمرير قيمة كوكي `li_at` الخاصة بك للوصول إلى نتائج أوسع. استخدم هذا على مسؤوليتك ووفق شروط لينكدإن.

## المتطلبات

1. Python 3.9+
2. تثبيت التبعيات:

```bash
pip install -r requirements.txt
python -m playwright install --with-deps chromium
```

## الاستخدام

```bash
python linkedin_people_scraper.py "https://www.linkedin.com/company/omanarabbank/people/" --limit 100 --out people.csv --li-at YOUR_LI_AT
```

يمكن وضع الكوكي في متغير بيئي بدل تمربره:

```bash
export LI_AT=YOUR_LI_AT
python linkedin_people_scraper.py "https://www.linkedin.com/company/omanarabbank/people/" -l 100 -o people.csv
```

سيتم إنشاء ملف `people.csv` يحتوي الأعمدة: `name,title,contact`.

# أداة استخراج بيانات العميل من صفحة ويب

أداة سطر أوامر بسيطة تأخذ رابط صفحة ويب وتستخرج اسم العميل ومعلومات التواصل منها (الإيميلات، أرقام الهواتف، روابط واتساب، وروابط الحسابات الاجتماعية) من نفس الصفحة فقط.

## المتطلبات والتثبيت

1) إنشاء بيئة افتراضية وتفعيلها:

```bash
python3 -m venv .venv && source .venv/bin/activate
```

2) تثبيت الاعتمادات:

```bash
pip install -r requirements.txt
```

## طريقة الاستخدام

```bash
python scrape_contact.py --url https://example.com --region SA
```

- **--url**: رابط الصفحة المستهدفة.
- **--region**: كود الدولة الافتراضي لاستخراج أرقام الهواتف (ISO-3166). افتراضيًا `SA`. أمثلة: `AE`, `KW`, `QA`, `OM`, `BH`.

المخرجات تكون بصيغة JSON على الشاشة. مثال:

```json
{
  "url": "https://example.com",
  "name": "Example",
  "emails": ["info@example.com"],
  "phones": ["+9665XXXXXXX"],
  "whatsapp": ["https://wa.me/9665XXXXXXX"],
  "socials": {"instagram": ["https://instagram.com/xxx"]}
}
```

## ملاحظات

- الأداة لا تُجري زحفًا للموقع، بل تقرأ الصفحة المحددة فقط.
- قد تختلف الدقة حسب تنسيق الصفحة، توفر البيانات، أو الحماية.
- جرّب تغيير **--region** لتحسين تفسير أرقام الهواتف المحلية.
