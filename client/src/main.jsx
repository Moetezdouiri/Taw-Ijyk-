import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import QRCode from "qrcode";
import "./styles.css";

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="auth-page">
        <div className="auth-card">
          <Logo />
          <p className="eyebrow">نعتذر، حدث خلل</p>
          <h1>تعذّر تحميل الصفحة</h1>
          <p className="hero-copy">{this.state.error.message}</p>
          <button className="primary-button" onClick={() => window.location.reload()}>
            أعد تحميل الصفحة <span>↻</span>
          </button>
        </div>
      </main>
    );
  }
}

function getStoredValue(storage, key, legacyKey) {
  const value = storage.getItem(key);
  if (value) return value;
  const legacyValue = storage.getItem(legacyKey);
  if (legacyValue) {
    storage.setItem(key, legacyValue);
    storage.removeItem(legacyKey);
  }
  return legacyValue || "";
}

function setStoredValue(storage, key, value, legacyKey) {
  storage.setItem(key, value);
  storage.removeItem(legacyKey);
}

function removeStoredValue(storage, key, legacyKey) {
  storage.removeItem(key);
  storage.removeItem(legacyKey);
}

const token = () => getStoredValue(localStorage, "taw_ijyk_token", "dorak_token");

const arabicErrors = {
  "The Taw Ijyk API is not responding. Keep npm run dev running and use http://localhost:5173.": "تعذّر الاتصال بالخدمة. تأكد من تشغيل التطبيق وحاول مجدداً.",
  "Your login session has expired. Please log in again.": "انتهت صلاحية جلستك. يرجى تسجيل الدخول مجدداً.",
  "Request failed": "تعذّر إكمال الطلب. حاول مجدداً.",
  "Enter a business name, valid email, and password of at least 8 characters.": "أدخل اسم النشاط وبريداً إلكترونياً صحيحاً وكلمة مرور من 8 أحرف على الأقل.",
  "An account with that email already exists.": "يوجد حساب مسجل بهذا البريد الإلكتروني.",
  "Could not create the account.": "تعذّر إنشاء الحساب. حاول مجدداً.",
  "Email verification is not configured. Please contact the administrator.": "تأكيد البريد الإلكتروني غير مهيأ. يرجى التواصل مع الإدارة.",
  "Could not send verification email. Please try again later.": "تعذّر إرسال رمز التحقق. حاول مجدداً.",
  "Please verify your email before signing in.": "يرجى تأكيد بريدك الإلكتروني قبل تسجيل الدخول.",
  "Enter your email and 6-digit verification code.": "أدخل بريدك الإلكتروني ورمز التحقق المكوّن من 6 أرقام.",
  "The verification code is invalid or has expired.": "رمز التحقق غير صحيح أو انتهت صلاحيته.",
  "Too many verification attempts. Request a new code.": "تجاوزت عدد المحاولات. اطلب رمزاً جديداً.",
  "Enter a valid email address.": "أدخل بريداً إلكترونياً صحيحاً.",
  "Could not verify the email address.": "تعذّر تأكيد البريد الإلكتروني.",
  "Email or password is incorrect.": "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
  "Google sign-in is not configured on the server.": "تسجيل الدخول عبر Google غير مهيأ على الخادم.",
  "Complete the required account details and try again.": "أكمل البيانات المطلوبة ثم حاول مجدداً.",
  "Google could not verify your sign-in. Please try again.": "تعذّر التحقق من تسجيل الدخول عبر Google. حاول مجدداً.",
  "Google did not provide a verified email address.": "لم يوفّر Google بريداً إلكترونياً مؤكداً.",
  "This email is already linked to a different Google account.": "هذا البريد مرتبط بحساب Google آخر.",
  "No account exists for this Google email. Create an account first.": "لا يوجد حساب بهذا البريد. أنشئ حساباً أولاً.",
  "An account with that email already exists. Please sign in instead.": "يوجد حساب بهذا البريد. سجّل الدخول بدلاً من ذلك.",
  "Could not complete Google sign-in.": "تعذّر إكمال تسجيل الدخول عبر Google.",
  "Account not found.": "لم نعثر على الحساب.",
  "An active subscription is required to manage orders.": "يلزم اشتراك فعّال لإدارة الطلبات. تواصل معنا لتفعيل اشتراكك.",
  "Could not verify the subscription.": "تعذّر التحقق من حالة الاشتراك. حاول مجدداً.",
  "Admin password is incorrect.": "كلمة مرور الإدارة غير صحيحة.",
  "Too many admin login attempts. Please wait and try again.": "محاولات دخول كثيرة. انتظر قليلاً ثم حاول مجدداً.",
  "Admin login rate limiting is temporarily unavailable.": "تسجيل دخول الإدارة غير متاح مؤقتاً. حاول لاحقاً.",
  "Admin access is not configured. Set ADMIN_PASSWORD to a strong password of at least 16 characters.": "دخول الإدارة غير مهيأ. أضف كلمة مرور إدارة قوية إلى إعدادات الخادم.",
  "Could not load business accounts.": "تعذّر تحميل الحسابات.",
  "Could not update the subscription.": "تعذّر تحديث الاشتراك.",
  "Choose an active or inactive subscription status.": "اختر حالة اشتراك صحيحة.",
  "Choose a valid subscription expiry date.": "اختر تاريخ انتهاء صحيحاً.",
  "Choose an expiry date in the future.": "اختر تاريخ انتهاء في المستقبل.",
  "Enter a valid subscription duration.": "أدخل مدة اشتراك صحيحة.",
  "Could not update the Google review link.": "تعذّر تحديث رابط تقييم Google.",
  "Business account not found.": "لم نعثر على حساب النشاط.",
  "Admin sign-in is required.": "يلزم تسجيل الدخول للإدارة.",
  "Admin access is required.": "هذه الصفحة مخصصة للإدارة.",
  "Your admin session has expired. Please sign in again.": "انتهت جلسة الإدارة. سجّل الدخول مجدداً.",
  "This account has been banned.": "تم حظر هذا الحساب. تواصل مع الإدارة إذا كنت تعتقد أن هذا خطأ.",
  "Could not verify the account.": "تعذّر التحقق من الحساب.",
  "Choose an active or banned account status.": "اختر حالة حساب صحيحة.",
  "Could not update the account status.": "تعذّر تحديث حالة الحساب.",
  "Could not delete the account and its orders.": "تعذّر حذف الحساب وطلباته.",
  "Enter a new password of at least 8 characters.": "أدخل كلمة مرور جديدة من 8 أحرف على الأقل.",
  "Current password is incorrect.": "كلمة المرور الحالية غير صحيحة.",
  "Could not update the password.": "تعذّر تحديث كلمة المرور. حاول مجدداً.",
  "Enter a business name between 1 and 100 characters.": "أدخل اسم نشاط يتراوح بين حرف واحد و100 حرف.",
  "Enter an 8-digit Tunisian phone number.": "أدخل رقم هاتف تونسيّاً مكوّناً من 8 أرقام.",
  "Enter a valid Google review link.": "أدخل رابط تقييم صحيحاً من Google.",
  "Could not update the business details.": "تعذّر تحديث بيانات النشاط. حاول مجدداً.",
  "Cloudinary logo uploads are not configured.": "رفع الشعارات غير مهيأ حالياً. يرجى التواصل مع الدعم.",
  "Logo file must be 5 MB or smaller.": "يجب ألا يتجاوز حجم الصورة 5 ميغابايت.",
  "Choose a valid PNG, JPG, or WebP logo.": "اختَر صورة شعار صالحة بصيغة PNG أو JPG أو WebP.",
  "Could not read the logo file.": "تعذّرت قراءة ملف الشعار.",
  "Could not upload business logo.": "تعذّر رفع شعار النشاط. حاول مجدداً.",
  "Could not remove business logo.": "تعذّر حذف شعار النشاط. حاول مجدداً.",
  "Enter a valid invoice number and time from 1 to 180 minutes.": "أدخل رقم فاتورة صحيحاً ومدة من دقيقة إلى 180 دقيقة.",
  "Enter additional time from 1 to 180 minutes.": "أدخل وقتاً إضافياً من دقيقة إلى 180 دقيقة.",
  "That invoice is already in the live queue.": "رقم الفاتورة موجود بالفعل في قائمة الانتظار.",
  "Order not found.": "ما لقيناش هالرقم. تأكد من الفاتورة أو اسأل الموظف.",
  "This QR code is missing its business identity. Please scan the current counter QR code.": "رمز الاستجابة السريعة غير مكتمل. امسح رمز النشاط الحالي.",
  "Business not found.": "لم نعثر على النشاط التجاري.",
  "Scan this business’s QR code before entering an invoice number.": "امسح رمز النشاط قبل إدخال رقم الفاتورة.",
  "We can’t find that order.": "ما لقيناش هالرقم. تأكد من الفاتورة أو اسأل الموظف.",
};

function localizeError(message) {
  return arabicErrors[message] || message;
}

function localizeCustomerError(error) {
  if (
    error instanceof TypeError ||
    error.message === arabicErrors["The Taw Ijyk API is not responding. Keep npm run dev running and use http://localhost:5173."]
  ) {
    return "الإنترنت ضعيف، نعاودو المحاولة";
  }
  return localizeError(error.message);
}

async function readJson(response) {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw new Error(arabicErrors["The Taw Ijyk API is not responding. Keep npm run dev running and use http://localhost:5173."]);
  }
  return response.json();
}

async function api(path, options = {}) {
  const { headers = {}, ...fetchOptions } = options;
  const response = await fetch(path, {
    ...fetchOptions,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}`, ...headers },
  });
  const data = await readJson(response);
  if (response.status === 401) {
    removeStoredValue(localStorage, "taw_ijyk_token", "dorak_token");
    if (["#qr", "#orders", "#dashboard", "#settings"].includes(window.location.hash)) window.location.hash = "#login";
    throw new Error(data.error || arabicErrors["Your login session has expired. Please log in again."]);
  }
  if (!response.ok) throw new Error(data.error || arabicErrors["Request failed"]);
  return data;
}

function Logo({ english = false }) {
  return <img className="brand-logo" src="/logo.png" alt={english ? "Taw Ijyk" : "توا يجيك"} />;
}

function ThemeToggle({ theme, onToggle, english = false }) {
  const isLight = theme === "light";
  return (
    <button
      className={`theme-toggle${isLight ? " is-light" : ""}`}
      type="button"
      aria-label={english
        ? isLight ? "Switch to dark mode" : "Switch to light mode"
        : isLight ? "التبديل إلى الوضع الداكن" : "التبديل إلى الوضع الفاتح"}
      title={english
        ? isLight ? "Switch to dark mode" : "Switch to light mode"
        : isLight ? "التبديل إلى الوضع الداكن" : "التبديل إلى الوضع الفاتح"}
      role="switch"
      aria-checked={isLight}
      onClick={onToggle}
    >
      <span className="theme-toggle-thumb" aria-hidden="true">
        {isLight ? (
          <svg viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24">
            <path d="M20.2 15.4A8.5 8.5 0 0 1 8.6 3.8 8.5 8.5 0 1 0 20.2 15.4Z" />
            <circle cx="17.5" cy="6" r=".8" />
            <circle cx="20" cy="10" r=".6" />
          </svg>
        )}
      </span>
    </button>
  );
}

function BusinessLogoField({ logoUrl, onSaved }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const upload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    setMessage("");
    setError("");
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("اختَر صورة بصيغة PNG أو JPG أو WebP.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("يجب ألا يتجاوز حجم الصورة 5 ميغابايت.");
      return;
    }

    setBusy(true);
    try {
      const updated = await api("/api/auth/business/logo", {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      onSaved(updated);
      setMessage("تم تحديث شعار النشاط.");
    } catch (uploadError) {
      setError(localizeError(uploadError.message));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const updated = await api("/api/auth/business/logo", { method: "DELETE" });
      onSaved(updated);
      setMessage("تم حذف الشعار.");
    } catch (removeError) {
      setError(localizeError(removeError.message));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="account-detail business-logo-detail">
      <span>شعار النشاط التجاري</span>
      <div className="business-logo-controls">
        <div className="business-logo-preview">
          {logoUrl ? <img src={logoUrl} alt="شعار النشاط التجاري" /> : <span aria-hidden="true">✦</span>}
        </div>
        <div className="business-logo-actions">
          <input
            ref={inputRef}
            className="business-logo-input"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={upload}
            aria-label="اختيار شعار النشاط التجاري"
          />
          <button className="edit-button" type="button" disabled={busy} onClick={() => inputRef.current?.click()}>
            {busy ? "جارٍ التحديث…" : logoUrl ? "تغيير الشعار" : "إضافة شعار"}
          </button>
          {logoUrl && <button className="edit-button remove-logo-button" type="button" disabled={busy} onClick={remove}>حذف</button>}
          <small>PNG أو JPG أو WebP، بحد أقصى 5 ميغابايت.</small>
        </div>
      </div>
      <p className={`form-message${error ? " has-error" : message ? " success" : ""}`} role={error ? "alert" : "status"}>{error || message}</p>
    </div>
  );
}

function PasswordField({ id, label, value, onChange, autoComplete, minLength }) {
  const [visible, setVisible] = useState(false);
  return (
    <>
      <label htmlFor={id}>{label}</label>
      <div className="input-wrap password-input">
        <input id={id} type={visible ? "text" : "password"} dir="ltr" autoComplete={autoComplete} minLength={minLength} value={value} onChange={onChange} required />
        <button className="password-toggle" type="button" aria-label={visible ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"} aria-pressed={visible} onClick={() => setVisible(!visible)}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6Z" />
            <circle cx="12" cy="12" r="2.5" />
            {!visible && <path d="m4 4 16 16" />}
          </svg>
        </button>
      </div>
    </>
  );
}

function EditableAccountField({ field, label, value, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || "");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const edit = () => {
    setDraft(value || "");
    setMessage("");
    setError("");
    setEditing(true);
  };
  const save = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");
    try {
      const updated = await api("/api/auth/business", {
        method: "PATCH",
        body: JSON.stringify({ [field]: draft }),
      });
      onSaved(updated);
      setDraft(updated[field] || "");
      setEditing(false);
      setMessage("تم الحفظ بنجاح.");
    } catch (saveError) {
      setError(localizeError(saveError.message));
    }
  };

  return (
    <div className="account-detail">
      <span>{label}</span>
      {editing ? (
        <form className="business-name-form" onSubmit={save}>
          <div className={`input-wrap${field === "phone" ? " phone-input" : ""}`}>
            {field === "phone" && <span className="phone-prefix" dir="ltr">+216</span>}
            <input
              aria-label={label}
              type={field === "phone" ? "tel" : "text"}
              dir={field === "phone" ? "ltr" : undefined}
              inputMode={field === "phone" ? "numeric" : undefined}
              pattern={field === "phone" ? "[0-9]{8}" : undefined}
              maxLength={field === "phone" ? 8 : 100}
              value={draft}
              onChange={(event) => setDraft(field === "phone" ? event.target.value.replace(/\D/g, "").slice(0, 8) : event.target.value)}
              required
            />
          </div>
          <div className="business-name-actions">
            <button className="primary-button" type="submit">حفظ</button>
            <button className="secondary-button" type="button" onClick={() => { setEditing(false); setError(""); }}>إلغاء</button>
          </div>
          <p className={`form-message${error ? " has-error" : ""}`}>{error}</p>
        </form>
      ) : (
        <div className="account-value">
          <strong>{field === "phone" && value ? <span dir="ltr">+216 {value}</span> : value || "—"}</strong>
          <button className="edit-button" type="button" onClick={edit}>تعديل</button>
        </div>
      )}
      {!editing && <p className={`form-message${error ? " has-error" : message ? " success" : ""}`}>{error || message}</p>}
    </div>
  );
}

function BusinessReviewLinkField({ value, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || "");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const edit = () => {
    setDraft(value || "");
    setMessage("");
    setError("");
    setEditing(true);
  };
  const save = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");
    try {
      const updated = await api("/api/auth/business", {
        method: "PATCH",
        body: JSON.stringify({ googleReviewUrl: draft }),
      });
      onSaved(updated);
      setDraft(updated.googleReviewUrl || "");
      setEditing(false);
      setMessage("تم حفظ رابط تقييم Google.");
    } catch (saveError) {
      setError(localizeError(saveError.message));
    }
  };

  return (
    <div className="account-detail">
      <span>رابط تقييم Google</span>
      {editing ? (
        <form className="business-name-form" onSubmit={save}>
          <div className="input-wrap">
            <input
              aria-label="رابط تقييم Google"
              type="url"
              dir="ltr"
              maxLength={500}
              placeholder="https://g.page/r/.../review"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
            />
          </div>
          <small>اتركه فارغاً لإخفاء النجوم من صفحة متابعة الطلب.</small>
          <div className="business-name-actions">
            <button className="primary-button" type="submit">حفظ</button>
            <button className="secondary-button" type="button" onClick={() => { setEditing(false); setError(""); }}>إلغاء</button>
          </div>
          <p className={`form-message${error ? " has-error" : ""}`} role={error ? "alert" : undefined}>{error}</p>
        </form>
      ) : (
        <div className="account-value">
          <strong dir="ltr">{value || "—"}</strong>
          <button className="edit-button" type="button" onClick={edit}>تعديل</button>
        </div>
      )}
      {!editing && <p className={`form-message${error ? " has-error" : message ? " success" : ""}`}>{error || message}</p>}
      <small>تظهر النجوم للزبون بعد أن يعلّم المحاسب الطلب كجاهز.</small>
    </div>
  );
}

async function createBusinessQrPoster(url, businessName) {
  await document.fonts.ready;
  const [qrDataUrl, posterTemplate, qrLogo] = await Promise.all([
    QRCode.toDataURL(url, {
      errorCorrectionLevel: "H",
      margin: 4,
      width: 1024,
      color: { dark: "#17182d", light: "#ffffff" },
    }),
    loadImage("/qr-poster-template.png"),
    loadImage("/qr-logo.png"),
  ]);
  const qrImage = await loadImage(qrDataUrl);
  const canvas = document.createElement("canvas");
  const scale = 2;
  canvas.width = posterTemplate.naturalWidth * scale;
  canvas.height = posterTemplate.naturalHeight * scale;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not create the QR poster canvas.");
  context.scale(scale, scale);
  context.drawImage(posterTemplate, 0, 0);

  context.textAlign = "center";
  context.direction = /[\u0590-\u08ff]/.test(businessName) ? "rtl" : "ltr";
  let nameSize = 32;
  context.font = `700 ${nameSize}px Cairo, Tahoma, sans-serif`;
  while (nameSize > 18 && context.measureText(businessName).width > 285) {
    nameSize -= 1;
    context.font = `700 ${nameSize}px Cairo, Tahoma, sans-serif`;
  }
  context.fillStyle = "#fff";
  context.textBaseline = "middle";
  context.fillText(businessName, 335, 214, 285);
  context.textBaseline = "alphabetic";

  context.fillStyle = "#fff";
  context.fillRect(106, 276, 458, 458);
  context.drawImage(qrImage, 106, 276, 458, 458);

  context.beginPath();
  context.arc(335, 510, 46, 0, Math.PI * 2);
  context.fillStyle = "#fff";
  context.fill();
  context.drawImage(qrLogo, 204, 101, 224, 153, 301, 487, 68, 46);

  return canvas.toDataURL("image/png");
}

function loadImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load QR poster image: ${source}`));
    image.src = source;
  });
}

function AuthBackground({ theme }) {
  const canvasRef = React.useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const desktopPointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    let width = 0;
    let height = 0;
    let frame = 0;
    let previousTime = 0;
    let pointerX = 0;
    let pointerY = 0;
    let parallaxX = 0;
    let parallaxY = 0;
    let stars = [];
    let dust = [];

    const random = (min, max) => min + Math.random() * (max - min);
    const resize = () => {
      const pixelRatio = window.devicePixelRatio || 1;
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

      const isPhone = width <= 520;
      stars = Array.from({ length: isPhone ? 18 : 34 }, (_, index) => ({
        x: random(0, width),
        y: random(0, height),
        radius: random(1, index % 5 === 0 ? 2.2 : 1.55),
        phase: random(0, Math.PI * 2),
        speed: random(.45, 1.15),
        depth: random(.25, 1),
        color: ["#63d9ff", "#529dff", "#a68bff", "#8c78ff"][index % 4],
        lightColor: ["#248bc1", "#8c54b8", "#bd4f9c", "#586cb9"][index % 4],
      }));
      dust = Array.from({ length: isPhone ? 55 : 125 }, () => ({
        x: random(0, width),
        y: random(0, height),
        radius: random(.45, 1.15),
        speed: random(5, 15),
        sway: random(2, 8),
        phase: random(0, Math.PI * 2),
        depth: random(.15, .75),
        alpha: random(.16, .43),
      }));
      draw(0, true);
    };

    const draw = (time, staticFrame = false) => {
      const seconds = time / 1000;
      const delta = Math.min((time - previousTime) / 1000 || 0, .04);
      const isLight = theme === "light";
      previousTime = time;
      parallaxX += (pointerX - parallaxX) * .045;
      parallaxY += (pointerY - parallaxY) * .045;
      context.clearRect(0, 0, width, height);
      context.fillStyle = isLight ? "#eae8f5" : "#070817";
      context.fillRect(0, 0, width, height);

      const glows = isLight ? [
        { x: width * .12, y: height * .18, radius: Math.max(width, height) * .58, color: "rgba(119, 62, 191, .18)" },
        { x: width * .9, y: height * .38, radius: Math.max(width, height) * .62, color: "rgba(28, 137, 198, .16)" },
        { x: width * .48, y: height * 1.02, radius: Math.max(width, height) * .65, color: "rgba(204, 66, 157, .12)" },
      ] : [
        { x: width * .12, y: height * .18, radius: Math.max(width, height) * .58, color: "rgba(86, 33, 166, .2)" },
        { x: width * .9, y: height * .38, radius: Math.max(width, height) * .62, color: "rgba(0, 94, 175, .16)" },
        { x: width * .48, y: height * 1.02, radius: Math.max(width, height) * .65, color: "rgba(112, 31, 125, .13)" },
      ];
      for (const [index, glow] of glows.entries()) {
        const driftX = isLight ? Math.sin(seconds * .16 + index * 2.1) * width * .12 : 0;
        const driftY = isLight ? Math.cos(seconds * .13 + index * 1.8) * height * .1 : 0;
        const x = glow.x + driftX + parallaxX * .7;
        const y = glow.y + driftY + parallaxY * .7;
        const gradient = context.createRadialGradient(x, y, 0, x, y, glow.radius);
        gradient.addColorStop(0, glow.color);
        gradient.addColorStop(1, isLight ? "rgba(234, 232, 245, 0)" : "rgba(7, 8, 23, 0)");
        context.fillStyle = gradient;
        context.fillRect(0, 0, width, height);
      }

      if (isLight) {
        const blobs = [
          { x: .15, y: .32, color: "rgba(156, 95, 220, .27)", speed: .24, phase: .2 },
          { x: .83, y: .28, color: "rgba(54, 153, 213, .24)", speed: .19, phase: 2.4 },
          { x: .56, y: .86, color: "rgba(215, 91, 174, .18)", speed: .22, phase: 4.2 },
        ];
        for (const blob of blobs) {
          const x = width * (blob.x + Math.sin(seconds * blob.speed + blob.phase) * .16);
          const y = height * (blob.y + Math.cos(seconds * blob.speed * .8 + blob.phase) * .2);
          const radius = Math.max(width, height) * .3;
          const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
          gradient.addColorStop(0, blob.color);
          gradient.addColorStop(1, "rgba(234, 232, 245, 0)");
          context.fillStyle = gradient;
          context.fillRect(0, 0, width, height);
        }
      }

      if (!isLight) for (const particle of dust) {
        if (!staticFrame) {
          particle.y -= particle.speed * delta;
          particle.x += Math.sin(seconds * .45 + particle.phase) * particle.sway * delta;
          if (particle.y < -3) {
            particle.y = height + 3;
            particle.x = random(0, width);
          }
        }
        const x = particle.x + parallaxX * particle.depth;
        const y = particle.y + parallaxY * particle.depth;
        context.beginPath();
        context.fillStyle = isLight
          ? `rgba(79, 83, 147, ${particle.alpha * .62})`
          : `rgba(157, 184, 255, ${particle.alpha})`;
        context.arc(x, y, particle.radius, 0, Math.PI * 2);
        context.fill();
      }

      if (!isLight) for (const star of stars) {
        const pulse = staticFrame ? .58 : (Math.sin(seconds * star.speed + star.phase) + 1) / 2;
        const brightness = .32 + pulse * .68;
        const color = isLight ? star.lightColor : star.color;
        const x = star.x + parallaxX * star.depth;
        const y = star.y + parallaxY * star.depth;
        const glowRadius = star.radius * (4 + pulse * 4);
        const glow = context.createRadialGradient(x, y, 0, x, y, glowRadius);
        glow.addColorStop(0, color);
        glow.addColorStop(.24, `${color}99`);
        glow.addColorStop(1, `${color}00`);
        context.globalAlpha = brightness;
        context.fillStyle = glow;
        context.beginPath();
        context.arc(x, y, glowRadius, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = isLight ? "#59477e" : "#eaf8ff";
        context.beginPath();
        context.arc(x, y, star.radius * (.7 + pulse * .3), 0, Math.PI * 2);
        context.fill();

        if (pulse > .91) {
          const sparkleAlpha = (pulse - .91) * 7;
          const length = star.radius * (3 + pulse * 2);
          context.globalAlpha = sparkleAlpha;
          context.strokeStyle = color;
          context.lineWidth = .7;
          context.beginPath();
          context.moveTo(x - length, y);
          context.lineTo(x + length, y);
          context.moveTo(x, y - length);
          context.lineTo(x, y + length);
          context.stroke();
        }
      }
      context.globalAlpha = 1;
    };

    const animate = (time) => {
      draw(time);
      frame = window.requestAnimationFrame(animate);
    };
    const onPointerMove = (event) => {
      if (reducedMotion.matches) return;
      pointerX = Math.max(-12, Math.min(12, ((event.clientX / width) * 2 - 1) * 12));
      pointerY = Math.max(-8, Math.min(8, ((event.clientY / height) * 2 - 1) * 8));
    };
    const updateMotion = () => {
      window.cancelAnimationFrame(frame);
      previousTime = 0;
      if (reducedMotion.matches) {
        pointerX = 0;
        pointerY = 0;
        parallaxX = 0;
        parallaxY = 0;
        draw(0, true);
      } else {
        frame = window.requestAnimationFrame(animate);
      }
    };

    resize();
    updateMotion();
    window.addEventListener("resize", resize);
    if (desktopPointer.matches) {
      window.addEventListener("pointermove", onPointerMove, { passive: true });
    }
    reducedMotion.addEventListener("change", updateMotion);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      reducedMotion.removeEventListener("change", updateMotion);
    };
  }, [theme]);

  return <canvas ref={canvasRef} className="auth-background" aria-hidden="true" />;
}

function Auth({ signup = false, theme, onToggleTheme }) {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [verificationEmail, setVerificationEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [verifiedEmail, setVerifiedEmail] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleSignupCredential, setGoogleSignupCredential] = useState("");
  const googleButtonRef = React.useRef(null);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!googleClientId || !googleButtonRef.current) return undefined;
    let active = true;
    const initializeGoogleButton = () => {
      if (!active || !window.google?.accounts?.id || !googleButtonRef.current) return;
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: async ({ credential }) => {
          if (signup) {
            setGoogleSignupCredential(credential);
            setError("");
            return;
          }
          setError("");
          setGoogleLoading(true);
          try {
            const result = await api("/api/auth/google", {
              method: "POST",
              body: JSON.stringify({
                credential,
                mode: "login",
              }),
            });
            setStoredValue(localStorage, "taw_ijyk_token", result.token, "dorak_token");
            window.location.hash = "#dashboard";
          } catch (googleError) {
            setError(localizeError(googleError.message));
          } finally {
            setGoogleLoading(false);
          }
        },
      });
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: "outline",
        size: "large",
        shape: "rectangular",
        text: signup ? "signup_with" : "signin_with",
        locale: "ar",
        width: String(Math.min(googleButtonRef.current.clientWidth, 400)),
      });
    };

    if (window.google?.accounts?.id) {
      initializeGoogleButton();
    } else {
      let script = document.querySelector('script[data-google-identity]');
      if (!script) {
        script = document.createElement("script");
        script.src = "https://accounts.google.com/gsi/client";
        script.async = true;
        script.defer = true;
        script.dataset.googleIdentity = "true";
        document.head.appendChild(script);
      }
      script.addEventListener("load", initializeGoogleButton);
      script.addEventListener("error", () => {
        if (active) setError("تعذّر تحميل تسجيل الدخول عبر Google.");
      }, { once: true });
    }
    return () => {
      active = false;
    };
  }, [googleClientId, signup]);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      if (signup) {
        await api("/api/auth/signup", { method: "POST", body: JSON.stringify(form) });
        setVerificationEmail(form.email.trim().toLowerCase());
        setMessage("أرسلنا رمز التحقق إلى بريدك الإلكتروني.");
        return;
      }
      const result = await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: form.email, password: form.password }),
      });
      setStoredValue(localStorage, "taw_ijyk_token", result.token, "dorak_token");
      window.location.hash = "#dashboard";
    } catch (e) {
      setError(localizeError(e.message));
      if (e.message === "Please verify your email before signing in.") {
        setVerificationEmail(form.email.trim().toLowerCase());
      }
    }
  };
  const submitVerification = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      await api("/api/auth/verify-email", {
        method: "POST",
        body: JSON.stringify({ email: verificationEmail, code: verificationCode }),
      });
      setForm((current) => ({ ...current, email: verificationEmail }));
      setVerifiedEmail(true);
    } catch (verificationError) {
      setError(localizeError(verificationError.message));
    }
  };
  const continueToLogin = () => {
    setVerifiedEmail(false);
    setVerificationEmail("");
    setVerificationCode("");
    setMessage("تم تأكيد بريدك الإلكتروني. سجّل الدخول للمتابعة.");
    if (window.location.hash !== "#login") window.location.hash = "#login";
  };
  const resendVerification = async () => {
    setError("");
    setMessage("");
    try {
      await api("/api/auth/resend-verification", {
        method: "POST",
        body: JSON.stringify({ email: verificationEmail }),
      });
      setMessage("إذا لم يصلك رمز جديد، انتظر دقيقة قبل إعادة الطلب.");
    } catch (resendError) {
      setError(localizeError(resendError.message));
    }
  };
  const submitGoogleSignup = async (event) => {
    event.preventDefault();
    setError("");
    setGoogleLoading(true);
    try {
      const result = await api("/api/auth/google", {
        method: "POST",
        body: JSON.stringify({
          credential: googleSignupCredential,
          mode: "signup",
          name: form.name.trim(),
        }),
      });
      setStoredValue(localStorage, "taw_ijyk_token", result.token, "dorak_token");
      window.location.hash = "#dashboard";
    } catch (googleError) {
      setError(localizeError(googleError.message));
    } finally {
      setGoogleLoading(false);
    }
  };
  const update = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  return (
    <main className="auth-page">
      <AuthBackground theme={theme} />
      <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      <div className="auth-layout">
        <div className="auth-card">
          <div className="auth-logo-window"><Logo english /></div>
          {verifiedEmail ? <>
            <p className="eyebrow">تم التأكيد</p>
            <h1 className="auth-title">تم تأكيد بريدك الإلكتروني</h1>
            <p className="hero-copy">يمكنك الآن تسجيل الدخول باستخدام بريدك الإلكتروني وكلمة المرور.</p>
            <button className="primary-button" type="button" onClick={continueToLogin}>الانتقال لتسجيل الدخول <span>←</span></button>
          </> : verificationEmail ? <>
            <p className="eyebrow">تأكيد البريد الإلكتروني</p>
            <h1 className="auth-title">أدخل رمز التحقق</h1>
            <p className="hero-copy">أرسلنا رمزاً من 6 أرقام إلى {verificationEmail}. صلاحية الرمز 15 دقيقة.</p>
            <form onSubmit={submitVerification}>
              <label htmlFor="verification-code">رمز التحقق</label>
              <div className="input-wrap"><input id="verification-code" type="text" inputMode="numeric" autoComplete="one-time-code" dir="ltr" maxLength="6" pattern="[0-9]{6}" value={verificationCode} onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, "").slice(0, 6))} required /></div>
              <button className="primary-button">تأكيد البريد الإلكتروني <span>←</span></button>
              <p className={`form-message${error ? " has-error" : message ? " success" : ""}`} role={error ? "alert" : "status"}>{error || message}</p>
            </form>
            <button className="google-back" type="button" onClick={resendVerification}>إعادة إرسال الرمز</button>
            <button className="google-back" type="button" onClick={() => { setVerificationEmail(""); setVerificationCode(""); setError(""); setMessage(""); }}>تغيير البريد الإلكتروني</button>
          </> : googleSignupCredential ? <>
            <p className="eyebrow">خطوة أخيرة</p>
            <h1 className="auth-title">ما اسم نشاطك التجاري؟</h1>
            <p className="hero-copy">أدخل اسم النشاط الذي سيظهر في حسابك، ثم أكمل إنشاء الحساب باستخدام Google.</p>
            <form onSubmit={submitGoogleSignup}>
              <label htmlFor="google-business-name">اسم النشاط التجاري</label>
              <div className="input-wrap"><input id="google-business-name" value={form.name} onChange={update("name")} autoFocus required /></div>
              <button className="primary-button" disabled={googleLoading}>{googleLoading ? "جارٍ إنشاء الحساب..." : "إنشاء الحساب"} <span>←</span></button>
              <p className={`form-message${error ? " has-error" : ""}`} role={error ? "alert" : "status"}>{error}</p>
            </form>
            <button className="google-back" type="button" onClick={() => { setGoogleSignupCredential(""); setError(""); }}>العودة</button>
          </> : <>
            {signup && <p className="eyebrow">ابدأ الآن</p>}
            <h1 className={`auth-title ${signup ? "signup-title" : "login-title"}`}>{signup ? <>أنشئ حساب<br /><em>نشاطك التجاري</em></> : <>مرحباً <em>بعودتك</em></>}</h1>
            <p className="hero-copy">{signup ? "أنشئ حساب نشاطك وابدأ بتنظيم الطلبات." : "سجّل الدخول لمتابعة قائمة طلباتك المباشرة."}</p>
            <form onSubmit={submit}>
              {signup && <>
                <label htmlFor="business-name">اسم النشاط التجاري</label>
                <div className="input-wrap"><input id="business-name" value={form.name} onChange={update("name")} autoComplete="organization" required /></div>
              </>}
              <label htmlFor="business-email">البريد الإلكتروني</label>
              <div className="input-wrap"><input id="business-email" type="email" dir="ltr" autoComplete="email" value={form.email} onChange={update("email")} required /></div>
              <label htmlFor="business-password">كلمة المرور</label>
              <div className="input-wrap"><input id="business-password" type="password" dir="ltr" autoComplete={signup ? "new-password" : "current-password"} value={form.password} onChange={update("password")} minLength="8" required /></div>
              <button className="primary-button">{signup ? "إنشاء الحساب" : "تسجيل الدخول"} <span>←</span></button>
              <p className={`form-message${error ? " has-error" : message ? " success" : ""}`} role={error ? "alert" : "status"}>{error || message}</p>
            </form>
            {googleClientId && <>
              <div className="auth-divider"><span>أو</span></div>
              <div className={`google-signin${googleLoading ? " is-loading" : ""}`} ref={googleButtonRef} />
              {googleLoading && <p className="google-status">جارٍ تسجيل الدخول عبر Google...</p>}
            </>}
          </>}
          {!verificationEmail && <p className="auth-switch"><a href={signup ? "#login" : "#signup"}>{signup ? "لديك حساب؟ سجّل الدخول" : "إنشاء حساب نشاط تجاري"}</a></p>}
        </div>
        <aside className="auth-showcase" aria-label="مزايا توا يجيك">
          <div className="showcase-copy">
            <p className="showcase-kicker">تجربة انتظار أذكى</p>
            <h2>دورك واضح،<br /><em>وانتظارك أريح.</em></h2>
            <p>نظّم الطلبات وخلي حرفاءك يتابعوا دورهم بكل سهولة، من أول مسح للرمز حتى الاستلام.</p>
          </div>
          <div className="queue-preview" aria-label="مثال على قائمة انتظار الطلبات">
            <div className="queue-preview-heading">
              <span><i /> قائمة الانتظار</span>
              <span>توا</span>
            </div>
            <div className="preview-order">
              <span className="preview-number">#1284</span>
              <span className="preview-status">قيد التحضير</span>
              <span className="preview-dots">•••</span>
            </div>
            <div className="preview-order is-next">
              <span className="preview-number">#1285</span>
              <span className="preview-status">دورك قريب</span>
              <span className="preview-dots">•••</span>
            </div>
            <div className="preview-order">
              <span className="preview-number">#1286</span>
              <span className="preview-status">بانتظارك</span>
              <span className="preview-dots">•••</span>
            </div>
            <div className="queue-preview-footer">
              <span className="preview-progress"><i /></span>
              <span>كل شيء واضح، بدون انتظار على الكاونتر</span>
            </div>
          </div>
          <div className="showcase-steps">
            <div><span>01</span><strong>امسح الرمز</strong></div>
            <div><span>02</span><strong>تابع دورك</strong></div>
            <div><span>03</span><strong>استلم طلبك</strong></div>
          </div>
        </aside>
      </div>
    </main>
  );
}

function adminSessionToken() {
  return getStoredValue(sessionStorage, "taw_ijyk_admin_token", "dorak_admin_token");
}

async function adminApi(path, options = {}) {
  const { headers = {}, ...fetchOptions } = options;
  const requestHeaders = new Headers(headers);
  requestHeaders.set("Content-Type", "application/json");
  const sessionToken = adminSessionToken();
  if (sessionToken) requestHeaders.set("Authorization", `Bearer ${sessionToken}`);
  const response = await fetch(path, { ...fetchOptions, headers: requestHeaders });
  const data = await readJson(response);
  if (!response.ok) {
    const error = new Error(data.error || arabicErrors["Request failed"]);
    error.status = response.status;
    throw error;
  }
  return data;
}

function Admin({ theme, onToggleTheme }) {
  const [sessionToken, setSessionToken] = useState(adminSessionToken);
  const [password, setPassword] = useState("");
  const [businesses, setBusinesses] = useState([]);
  const [statuses, setStatuses] = useState({});
  const [durations, setDurations] = useState({});
  const [customDurationValues, setCustomDurationValues] = useState({});
  const [customDurationUnits, setCustomDurationUnits] = useState({});
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [accountFilter, setAccountFilter] = useState("all");
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [paymentAmounts, setPaymentAmounts] = useState({});
  const [adminPage, setAdminPage] = useState("accounts");
  const [historyData, setHistoryData] = useState({ events: [], totalTnd: 0, thisMonthTnd: 0, recordedPayments: 0, truncated: false });
  const [historySearch, setHistorySearch] = useState("");
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyRefreshCount, setHistoryRefreshCount] = useState(0);

  const loadBusinesses = async () => {
    setLoading(true);
    setError("");
    try {
      const accounts = await adminApi("/api/admin/businesses");
      setBusinesses(accounts);
      setSelectedAccountId((current) => current || accounts[0]?._id || "");
      setStatuses(Object.fromEntries(accounts.map((account) => [
        account._id,
        account.subscriptionStatus === "active"
          && account.subscriptionExpiresAt
          && new Date(account.subscriptionExpiresAt).getTime() > Date.now()
          ? "active"
          : "inactive",
      ])));
      setDurations((current) => Object.fromEntries(accounts.map((account) => [account._id, current[account._id] || "30d"])));
      setCustomDurationValues((current) => Object.fromEntries(accounts.map((account) => [account._id, current[account._id] || "30"])));
      setCustomDurationUnits((current) => Object.fromEntries(accounts.map((account) => [account._id, current[account._id] || "days"])));
      setPaymentAmounts((current) => Object.fromEntries(accounts.map((account) => [account._id, current[account._id] ?? ""])));
    } catch (loadError) {
      if (loadError.status === 401 || loadError.status === 403) {
        removeStoredValue(sessionStorage, "taw_ijyk_admin_token", "dorak_admin_token");
        setSessionToken("");
      }
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sessionToken) loadBusinesses();
  }, [sessionToken]);
  useEffect(() => {
    if (!sessionToken || adminPage !== "history") return undefined;
    let active = true;
    setHistoryLoading(true);
    setError("");
    adminApi("/api/admin/history")
      .then((data) => { if (active) setHistoryData(data); })
      .catch((historyError) => {
        if (!active) return;
        if (historyError.status === 401 || historyError.status === 403) {
          removeStoredValue(sessionStorage, "taw_ijyk_admin_token", "dorak_admin_token");
          setSessionToken("");
        }
        setError(historyError.message);
      })
      .finally(() => { if (active) setHistoryLoading(false); });
    return () => { active = false; };
  }, [sessionToken, adminPage, historyRefreshCount]);

  const signIn = async (event) => {
    event.preventDefault();
    setError("");
    try {
      const result = await adminApi("/api/admin/login", {
        method: "POST",
        body: JSON.stringify({ password }),
      });
      setStoredValue(sessionStorage, "taw_ijyk_admin_token", result.token, "dorak_admin_token");
      setPassword("");
      setSessionToken(result.token);
    } catch (loginError) {
      setError(loginError.message);
    }
  };

  const signOut = () => {
    removeStoredValue(sessionStorage, "taw_ijyk_admin_token", "dorak_admin_token");
    setSessionToken("");
    setBusinesses([]);
    setAdminPage("accounts");
  };

  const saveSubscription = async (account) => {
    const customDurationValue = customDurationValues[account._id] === undefined
      ? "30"
      : customDurationValues[account._id];
    const expiresAt = getSubscriptionExpiryDate(
      account,
      durations[account._id] || "30d",
      customDurationValue,
      customDurationUnits[account._id] || "days",
    );
    if ((statuses[account._id] || "inactive") === "active" && !expiresAt) {
      setError("Enter a valid subscription duration.");
      return;
    }
    setSavingId(account._id);
    setError("");
    setMessage("");
    try {
      await adminApi(`/api/admin/businesses/${account._id}/subscription`, {
        method: "PATCH",
        body: JSON.stringify({
          status: statuses[account._id] || "inactive",
          expiresAt,
          paymentAmountTnd: paymentAmounts[account._id],
        }),
      });
      setPaymentAmounts((current) => ({ ...current, [account._id]: "" }));
      setMessage(`Subscription updated for ${account.name}.`);
      await loadBusinesses();
      setPaymentAmounts((current) => ({ ...current, [account._id]: "" }));
    } catch (saveError) {
      if (saveError.status === 401 || saveError.status === 403) {
        removeStoredValue(sessionStorage, "taw_ijyk_admin_token", "dorak_admin_token");
        setSessionToken("");
      }
      setError(saveError.message);
    } finally {
      setSavingId("");
    }
  };

  const quickRenew = async (account) => {
    setSavingId(account._id);
    setError("");
    setMessage("");
    try {
      const expiresAt = getSubscriptionExpiryDate(account, "30d", "30", "days");
      await adminApi(`/api/admin/businesses/${account._id}/subscription`, {
        method: "PATCH",
        body: JSON.stringify({
          status: "active",
          expiresAt,
          paymentAmountTnd: paymentAmounts[account._id] ?? "",
        }),
      });
      setPaymentAmounts((current) => ({ ...current, [account._id]: "" }));
      setMessage(`30 days added for ${account.name}.`);
      await loadBusinesses();
      setPaymentAmounts((current) => ({ ...current, [account._id]: "" }));
    } catch (renewError) {
      setError(renewError.message);
    } finally {
      setSavingId("");
    }
  };

  const saveReviewLink = async (account, googleReviewUrl) => {
    setSavingId(account._id);
    setError("");
    setMessage("");
    try {
      const updated = await adminApi(`/api/admin/businesses/${account._id}/review-link`, {
        method: "PATCH",
        body: JSON.stringify({ googleReviewUrl }),
      });
      setBusinesses((current) => current.map((business) => (
        business._id === account._id ? { ...business, googleReviewUrl: updated.googleReviewUrl } : business
      )));
      setMessage(`Google review link updated for ${account.name}.`);
    } catch (saveError) {
      if (saveError.status === 401 || saveError.status === 403) {
        removeStoredValue(sessionStorage, "taw_ijyk_admin_token", "dorak_admin_token");
        setSessionToken("");
      }
      setError(saveError.message);
    } finally {
      setSavingId("");
    }
  };

  const updateAccountStatus = async (account, status) => {
    const action = status === "banned" ? "ban" : "unban";
    if (!window.confirm(`Are you sure you want to ${action} ${account.name}'s account?`)) return;
    setSavingId(account._id);
    setError("");
    setMessage("");
    try {
      await adminApi(`/api/admin/businesses/${account._id}/account-status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setMessage(status === "banned" ? `${account.name}'s account has been banned.` : `${account.name}'s ban has been lifted.`);
      await loadBusinesses();
    } catch (statusError) {
      if (statusError.status === 401 || statusError.status === 403) {
        removeStoredValue(sessionStorage, "taw_ijyk_admin_token", "dorak_admin_token");
        setSessionToken("");
      }
      setError(statusError.message);
    } finally {
      setSavingId("");
    }
  };

  const deleteAccount = async (account) => {
    const confirmation = window.prompt(`Permanently delete ${account.name} and all its orders? This cannot be undone. Type the business name to confirm.`);
    if (confirmation !== account.name) return;
    setSavingId(account._id);
    setError("");
    setMessage("");
    try {
      await adminApi(`/api/admin/businesses/${account._id}`, { method: "DELETE" });
      const remainingAccounts = businesses.filter((business) => business._id !== account._id);
      setBusinesses(remainingAccounts);
      setSelectedAccountId(remainingAccounts[0]?._id || "");
      setMessage(`${account.name}'s account and orders have been deleted.`);
    } catch (deleteError) {
      if (deleteError.status === 401 || deleteError.status === 403) {
        removeStoredValue(sessionStorage, "taw_ijyk_admin_token", "dorak_admin_token");
        setSessionToken("");
      }
      setError(deleteError.message);
    } finally {
      setSavingId("");
    }
  };

  const activeCount = businesses.filter(hasActiveSubscription).length;
  const bannedCount = businesses.filter((account) => account.accountStatus === "banned").length;
  const expiredCount = businesses.filter((account) => account.accountStatus !== "banned" && getSubscriptionState(account) === "expired").length;
  const inactiveCount = businesses.length - activeCount - expiredCount - bannedCount;
  const visibleBusinesses = businesses.filter((account) => {
    const matchesSearch = `${account.name} ${account.email}`.toLowerCase().includes(search.trim().toLowerCase());
    const state = getSubscriptionState(account);
    const matchesFilter = accountFilter === "all"
      || (accountFilter === "active" && account.accountStatus !== "banned" && state === "active")
      || (accountFilter === "expiring" && isExpiringSoon(account))
      || (accountFilter === "inactive" && account.accountStatus !== "banned" && state !== "active")
      || (accountFilter === "banned" && account.accountStatus === "banned");
    return matchesSearch && matchesFilter;
  });
  const selectedAccount = businesses.find((account) => account._id === selectedAccountId) || null;
  const visibleHistory = historyData.events.filter((event) => (
    `${event.businessName || ""} ${event.businessEmail || ""} ${event.type}`.toLowerCase().includes(historySearch.trim().toLowerCase())
  ));

  if (!sessionToken) {
    return (
      <main className="auth-page admin-login-page" lang="en" dir="ltr">
        <ThemeToggle theme={theme} onToggle={onToggleTheme} english />
        <div className="auth-card">
          <div className="auth-logo-window"><Logo /></div>
          <p className="eyebrow">ADMINISTRATION</p>
          <h1 className="auth-title">Admin sign in</h1>
          <p className="hero-copy">Enter your admin password to manage business accounts and subscriptions.</p>
          <form onSubmit={signIn}>
            <label htmlFor="admin-password">Admin password</label>
            <div className="input-wrap"><input id="admin-password" type="password" dir="ltr" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></div>
            <button className="primary-button">Sign in <span>→</span></button>
            <p className="form-message has-error" role="status">{error}</p>
          </form>
          <p className="auth-switch"><a href="#login">Back to cashier sign in</a></p>
        </div>
      </main>
    );
  }

  return (
    <div className="app-shell admin-shell" lang="en" dir="ltr">
      <div className="admin-layout">
        <aside className="admin-sidebar">
          <div className="admin-sidebar-brand"><Logo english /><span>Admin dashboard</span></div>
          <p className="admin-sidebar-label">MAIN MENU</p>
          <nav className="admin-sidebar-nav" aria-label="Admin navigation">
            <button type="button" className={adminPage === "accounts" ? "selected" : ""} onClick={() => setAdminPage("accounts")}>
              <span aria-hidden="true">♙</span> Business accounts
              <small>{businesses.length}</small>
            </button>
            <button type="button" className={adminPage === "history" ? "selected" : ""} onClick={() => setAdminPage("history")}>
              <span aria-hidden="true">◷</span> Payments &amp; history
            </button>
          </nav>
          <div className="admin-sidebar-spacer" />
          <div className="admin-sidebar-bottom">
            <ThemeToggle theme={theme} onToggle={onToggleTheme} english />
            <button type="button" className="admin-sidebar-logout" onClick={signOut}><span aria-hidden="true">↩</span> Sign out</button>
          </div>
        </aside>
        <main className="admin-main">
          <header className="admin-topbar">
            <div className="admin-topbar-title"><span>ADMINISTRATION</span><strong>{adminPage === "accounts" ? "Business accounts" : "Payments & history"}</strong></div>
            <button className="admin-refresh-button" type="button" onClick={adminPage === "accounts" ? loadBusinesses : () => setHistoryRefreshCount((count) => count + 1)} disabled={loading || historyLoading}>
              <span aria-hidden="true">↻</span> {loading || historyLoading ? "Refreshing…" : "Refresh data"}
            </button>
          </header>
          <div className="admin-content">
            {adminPage === "accounts" ? <>
            <section className="admin-heading" id="admin-overview">
              <div><p className="eyebrow">SUBSCRIPTION MANAGEMENT</p><h1>Business accounts</h1><p>Manage access, renewals, and account details.</p></div>
              <label className="admin-search">
                <span aria-hidden="true">⌕</span>
                <input type="search" placeholder="Search name or email" value={search} onChange={(event) => setSearch(event.target.value)} />
              </label>
            </section>
            {error && <div className="server-alert" role="alert"><strong>Something went wrong</strong><span>{error}</span></div>}
            {message && <p className="admin-success" role="status">{message}</p>}
            <section className="admin-accounts-section" id="admin-accounts">
              <div className="admin-filter-tabs" role="group" aria-label="Filter accounts">
                {[
                  ["all", "All", businesses.length],
                  ["active", "Active", activeCount],
                  ["expiring", "Expiring soon", businesses.filter((account) => account.accountStatus !== "banned" && isExpiringSoon(account)).length],
                  ["inactive", "Inactive", inactiveCount],
                  ["banned", "Banned", bannedCount],
                ].map(([value, label, count]) => (
                  <button type="button" className={accountFilter === value ? "selected" : ""} key={value} onClick={() => setAccountFilter(value)}>
                    {label}<span>{count}</span>
                  </button>
                ))}
              </div>
              <div className="admin-account-workspace">
                <section className="admin-table-panel" aria-label="Business account list">
                  {loading && businesses.length === 0 ? <p className="admin-loading">Loading accounts…</p> : (
                    <div className="admin-table-scroll">
                      <table className="admin-account-table">
                        <thead><tr><th>Business</th><th>Status</th><th>Expires</th><th>Last order activity</th><th>Actions</th></tr></thead>
                        <tbody>
                          {visibleBusinesses.map((account) => {
                            const state = getSubscriptionState(account);
                            const banned = account.accountStatus === "banned";
                            const selected = account._id === selectedAccountId;
                            return (
                              <tr
                                key={account._id}
                                className={selected ? "selected" : ""}
                                onClick={() => setSelectedAccountId(account._id)}
                                onKeyDown={(event) => {
                                  if (event.key === "Enter" || event.key === " ") {
                                    event.preventDefault();
                                    setSelectedAccountId(account._id);
                                  }
                                }}
                                tabIndex={0}
                                aria-selected={selected}
                              >
                                <td>
                                  <div className="admin-table-business">
                                    <span className="admin-business-avatar" aria-hidden="true">{account.logoUrl ? <img src={account.logoUrl} alt="" /> : account.name.trim().charAt(0) || "✦"}</span>
                                    <span><strong dir="auto">{account.name}</strong><small dir="ltr">{account.email}</small></span>
                                  </div>
                                </td>
                                <td><span className={`admin-status-pill ${banned ? "banned" : state}`}>{banned ? "Banned" : state === "active" ? "Active" : state === "expired" ? "Expired" : "Inactive"}</span>{isExpiringSoon(account) && !banned && <small className="admin-expiring-label">Expires soon</small>}</td>
                                <td>{account.subscriptionExpiresAt && state !== "inactive" ? new Date(account.subscriptionExpiresAt).toLocaleDateString("en-GB") : "—"}</td>
                                <td><span>{account.lastActivityAt ? new Date(account.lastActivityAt).toLocaleDateString("en-GB") : "No orders"}</span><small>{account.ordersToday || 0} today</small></td>
                                <td>
                                  <div className="admin-row-actions" onClick={(event) => event.stopPropagation()}>
                                    {account.phone && <a className="admin-whatsapp-action" href={`https://wa.me/216${account.phone}`} target="_blank" rel="noreferrer" aria-label={`Contact ${account.name} on WhatsApp`} title={`Contact ${account.name} on WhatsApp`}>
                                      <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M20.2 11.7a8.2 8.2 0 0 1-12.1 7.2L4 20l1.1-4a8.2 8.2 0 1 1 15.1-4.3Z" /><path d="M9 8.6c.2-.4.4-.4.7-.4h.5c.2 0 .4.1.5.4l.7 1.7c.1.2.1.4-.1.6l-.5.6c-.2.2-.2.4 0 .6.5.8 1.2 1.5 2.1 1.9.2.1.4.1.6-.1l.7-.8c.2-.2.4-.2.6-.1l1.6.8c.2.1.3.3.3.5 0 .4-.2 1.1-.7 1.4-.5.4-1.1.6-1.8.4-1-.2-2.2-.8-3.5-2-1.1-1-2-2.4-2.2-3.4-.2-.8 0-1.5.5-2.1Z" /></svg>
                                      <span>WhatsApp</span>
                                    </a>}
                                    {!banned && <button type="button" className="admin-quick-renew" disabled={savingId === account._id} onClick={() => quickRenew(account)}>{savingId === account._id ? "Saving…" : state === "active" ? "Renew 30d" : "Activate 30d"}</button>}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                          {!visibleBusinesses.length && <tr><td className="admin-table-empty" colSpan="5">{loading ? "Loading accounts…" : businesses.length ? "No accounts match your search." : "No business accounts yet."}</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <footer className="admin-table-footer"><span>Showing {visibleBusinesses.length} of {businesses.length} accounts</span><span>Order activity only</span></footer>
                </section>
                {selectedAccount && (() => {
                  const account = selectedAccount;
                  const state = getSubscriptionState(account);
                  const active = statuses[account._id] === "active";
                  const banned = account.accountStatus === "banned";
                  const expiryPreview = getSubscriptionExpiryDate(
                    account,
                    durations[account._id] || "30d",
                    customDurationValues[account._id] === undefined ? "30" : customDurationValues[account._id],
                    customDurationUnits[account._id] || "days",
                  );
                  return (
                    <aside className="admin-detail-panel" aria-label={`${account.name} account details`}>
                      <div className="admin-detail-heading">
                        <div><p className="eyebrow">ACCOUNT DETAILS</p><button className="admin-detail-close" type="button" onClick={() => setSelectedAccountId("")} aria-label="Close account details">×</button></div>
                        <span className="admin-business-avatar admin-detail-avatar">{account.logoUrl ? <img src={account.logoUrl} alt="" /> : account.name.trim().charAt(0) || "✦"}</span>
                        <h2 dir="auto">{account.name}</h2>
                        <p dir="ltr">{account.email}</p>
                        {account.phone ? <a className="admin-business-phone" href={`https://wa.me/216${account.phone}`} target="_blank" rel="noreferrer" dir="ltr">WhatsApp · +216 {account.phone}</a> : <small className="admin-business-no-phone">No WhatsApp number</small>}
                      </div>
                      <div className="admin-detail-metrics">
                        <div><small>Current status</small><span className={`admin-status-pill ${banned ? "banned" : state}`}>{banned ? "Banned" : state === "active" ? "Active" : state === "expired" ? "Expired" : "Inactive"}</span></div>
                        <div><small>Subscription ends</small><strong>{account.subscriptionExpiresAt ? new Date(account.subscriptionExpiresAt).toLocaleDateString("en-GB") : "Not set"}</strong></div>
                        <div><small>Joined</small><strong>{new Date(account.createdAt).toLocaleDateString("en-GB")}</strong></div>
                        <div><small>Orders today</small><strong>{account.ordersToday || 0}</strong></div>
                      </div>
                      <div className="admin-detail-section">
                        <h3>Subscription</h3>
                        <div className="admin-status-switch" role="group" aria-label={`${account.name} subscription status`}>
                          <button type="button" className={active ? "selected" : ""} disabled={banned} onClick={() => setStatuses((current) => ({ ...current, [account._id]: "active" }))}>Active</button>
                          <button type="button" className={!active ? "selected" : ""} disabled={banned} onClick={() => setStatuses((current) => ({ ...current, [account._id]: "inactive" }))}>Inactive</button>
                        </div>
                        <span className="admin-control-label">Duration</span>
                        <div className="admin-duration-presets" role="group" aria-label={`${account.name} subscription duration`}>
                          {[["30d", "30 days"], ["3m", "3 months"], ["1y", "1 year"], ["custom", "Custom"]].map(([value, label]) => (
                            <button type="button" className={durations[account._id] === value ? "selected" : ""} key={value} disabled={banned} onClick={() => setDurations((current) => ({ ...current, [account._id]: value }))}>{label}</button>
                          ))}
                        </div>
                        {durations[account._id] === "custom" && <div className="admin-custom-duration">
                          <input aria-label="Subscription duration amount" type="number" min="1" max={customDurationUnits[account._id] === "years" ? "10" : customDurationUnits[account._id] === "months" ? "120" : "3650"} value={customDurationValues[account._id] === undefined ? "30" : customDurationValues[account._id]} disabled={banned} onChange={(event) => setCustomDurationValues((current) => ({ ...current, [account._id]: event.target.value }))} />
                          <select aria-label="Subscription duration unit" value={customDurationUnits[account._id] || "days"} disabled={banned} onChange={(event) => setCustomDurationUnits((current) => ({ ...current, [account._id]: event.target.value }))}>
                            <option value="days">Days</option><option value="months">Months</option><option value="years">Years</option>
                          </select>
                        </div>}
                        {active && <small className="admin-expiry-preview">New expiry: {expiryPreview ? new Date(`${expiryPreview}T12:00:00`).toLocaleDateString("en-GB") : "—"}</small>}
                        <label className="admin-payment-amount"><span>Amount received (TND, optional)</span><input type="number" min="0" step="0.001" placeholder="Enter only if paid" value={paymentAmounts[account._id] ?? ""} onChange={(event) => setPaymentAmounts((current) => ({ ...current, [account._id]: event.target.value }))} /></label>
                        <button className="primary-button admin-save-subscription" type="button" disabled={banned || savingId === account._id || (active && !expiryPreview)} onClick={() => saveSubscription(account)}>{savingId === account._id ? "Saving…" : "Save subscription"}</button>
                      </div>
                      <AdminReviewLinkEditor
                        key={account._id}
                        value={account.googleReviewUrl || ""}
                        saving={savingId === account._id}
                        onSave={(googleReviewUrl) => saveReviewLink(account, googleReviewUrl)}
                      />
                      <div className="admin-danger-zone">
                        <div><strong>Danger zone</strong><small>Account removal is permanent.</small></div>
                        <div className="admin-danger-actions">
                          <button type="button" className={banned ? "admin-unban-button" : "admin-ban-button"} disabled={savingId === account._id} onClick={() => updateAccountStatus(account, banned ? "active" : "banned")}>{banned ? "Unban account" : "Ban account"}</button>
                          <button type="button" className="admin-delete-button" disabled={savingId === account._id} onClick={() => deleteAccount(account)}>Delete account</button>
                        </div>
                      </div>
                    </aside>
                  );
                })()}
              </div>
            </section>
            </> : <section className="admin-history-page">
              <div className="admin-heading">
                <div><p className="eyebrow">BUSINESS FINANCES</p><h1>Payments &amp; account history</h1><p>Review subscription payments, revenue, and account changes.</p></div>
                <label className="admin-search">
                  <span aria-hidden="true">⌕</span>
                  <input type="search" placeholder="Search account or event" value={historySearch} onChange={(event) => setHistorySearch(event.target.value)} />
                </label>
              </div>
              {error && <div className="server-alert" role="alert"><strong>Something went wrong</strong><span>{error}</span></div>}
              <div className="admin-revenue-grid" aria-label="Recorded revenue summary">
                <article className="admin-revenue-card"><span>All-time recorded revenue</span><strong>{formatTnd(historyData.totalTnd)}</strong><small>Based on amounts entered for renewals</small></article>
                <article className="admin-revenue-card"><span>Recorded this month</span><strong>{formatTnd(historyData.thisMonthTnd)}</strong><small>Current calendar month</small></article>
                <article className="admin-revenue-card"><span>Payments recorded</span><strong>{historyData.recordedPayments}</strong><small>Renewals with an amount entered</small></article>
              </div>
              <section className="admin-history-table-panel">
                <div className="admin-history-table-heading"><div><h2>Account &amp; payment activity</h2><p>Most recent activity first. Amounts not entered are not included in revenue.</p></div><span>{visibleHistory.length} records</span></div>
                {historyLoading ? <p className="admin-loading">Loading payments and history…</p> : <div className="admin-table-scroll">
                  <table className="admin-payment-table">
                    <thead><tr><th>Date</th><th>Account</th><th>Activity</th><th>Amount</th><th>Subscription expiry</th></tr></thead>
                    <tbody>
                      {visibleHistory.map((event) => {
                        const payment = event.type === "renewed";
                        const eventLabel = event.type === "created" ? "Account created"
                          : payment ? "Subscription renewed"
                            : event.type === "banned" ? "Account banned"
                              : event.type === "unbanned" ? "Ban lifted" : "Subscription deactivated";
                        return <tr key={event._id}>
                          <td>{new Date(event.createdAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</td>
                          <td><strong>{event.businessName}</strong>{event.businessEmail && <small>{event.businessEmail}</small>}</td>
                          <td><span className={`admin-event-pill ${payment ? "payment" : event.type}`}>{eventLabel}</span></td>
                          <td className={payment && event.amountTnd !== null && event.amountTnd !== undefined ? "admin-payment-value" : ""}>{payment && event.amountTnd !== null && event.amountTnd !== undefined ? formatTnd(event.amountTnd) : payment ? "Not recorded" : "—"}</td>
                          <td>{event.expiresAt ? new Date(event.expiresAt).toLocaleDateString("en-GB") : "—"}</td>
                        </tr>;
                      })}
                      {!visibleHistory.length && <tr><td className="admin-table-empty" colSpan="5">{historySearch ? "No history matches your search." : "No account or payment history yet."}</td></tr>}
                    </tbody>
                  </table>
                </div>}
                {historyData.truncated && <p className="admin-history-truncated">Showing the latest 500 history records. Revenue totals include all recorded renewal amounts.</p>}
              </section>
            </section>}
          </div>
        </main>
      </div>
    </div>
  );
}

function AdminReviewLinkEditor({ value, saving, onSave }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);

  return (
    <form className="admin-detail-section admin-review-link-editor" onSubmit={(event) => {
      event.preventDefault();
      onSave(draft);
    }}>
      <h3>Google review link</h3>
      <label className="admin-payment-amount">
        <span>Customer review URL</span>
        <input
          type="url"
          dir="ltr"
          maxLength={500}
          placeholder="https://g.page/r/.../review"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
      </label>
      <small className="admin-expiry-preview">Leave blank to remove the link from the customer page.</small>
      <button className="primary-button admin-save-subscription" type="submit" disabled={saving}>
        {saving ? "Saving…" : "Save review link"}
      </button>
    </form>
  );
}

function getSubscriptionState(account) {
  if (account.subscriptionStatus !== "active") return "inactive";
  if (!account.subscriptionExpiresAt || new Date(account.subscriptionExpiresAt).getTime() <= Date.now()) return "expired";
  return "active";
}

function formatTnd(amount) {
  return `${new Intl.NumberFormat("en-TN", { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(amount)} TND`;
}

function getSubscriptionExpiryDate(account, duration, customValue, customUnit) {
  const currentExpiry = account.subscriptionExpiresAt && new Date(account.subscriptionExpiresAt);
  const baseDate = account.subscriptionStatus === "active"
    && currentExpiry
    && currentExpiry.getTime() > Date.now()
    ? currentExpiry.toISOString().slice(0, 10)
    : localDateKey(new Date());
  const expiry = new Date(`${baseDate}T12:00:00`);
  if (duration === "30d") {
    expiry.setDate(expiry.getDate() + 30);
  } else if (duration === "3m") {
    addCalendarMonths(expiry, 3);
  } else if (duration === "1y") {
    addCalendarYears(expiry, 1);
  } else if (duration === "custom" && /^\d+$/.test(customValue)) {
    const amount = Number(customValue);
    if (customUnit === "days" && amount >= 1 && amount <= 3650) {
      expiry.setDate(expiry.getDate() + amount);
    } else if (customUnit === "months" && amount >= 1 && amount <= 120) {
      addCalendarMonths(expiry, amount);
    } else if (customUnit === "years" && amount >= 1 && amount <= 10) {
      addCalendarYears(expiry, amount);
    } else {
      return "";
    }
  } else {
    return "";
  }
  return localDateKey(expiry);
}

function addCalendarMonths(date, amount) {
  const day = date.getDate();
  date.setDate(1);
  date.setMonth(date.getMonth() + amount);
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  date.setDate(Math.min(day, lastDay));
}

function addCalendarYears(date, amount) {
  const day = date.getDate();
  const month = date.getMonth();
  date.setDate(1);
  date.setFullYear(date.getFullYear() + amount);
  date.setMonth(month);
  const lastDay = new Date(date.getFullYear(), month + 1, 0).getDate();
  date.setDate(Math.min(day, lastDay));
}

function hasActiveSubscription(business) {
  return Boolean(business) && business.accountStatus !== "banned" && getSubscriptionState(business) === "active";
}

function isExpiringSoon(business) {
  if (getSubscriptionState(business) !== "active") return false;
  const remaining = new Date(business.subscriptionExpiresAt).getTime() - Date.now();
  return remaining >= 0 && remaining <= 7 * 24 * 60 * 60 * 1000;
}

function localDateKey(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function shiftDate(dateKey, days) {
  const date = new Date(`${dateKey}T12:00:00`);
  date.setDate(date.getDate() + days);
  return localDateKey(date);
}

function formatHistoryDate(dateKey) {
  return new Date(`${dateKey}T12:00:00`).toLocaleDateString("ar-TN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function HistoryStatusFilter({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const options = [
    { value: "all", label: "كل الحالات" },
    { value: "waiting", label: "قيد التحضير" },
    { value: "ready", label: "جاهز للاستلام" },
  ];
  const selectedOption = options.find((option) => option.value === value) || options[0];

  useEffect(() => {
    if (!open) return undefined;
    const closeOnOutsideClick = (event) => {
      if (!containerRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, [open]);

  const handleKeyDown = (event) => {
    if (event.key === "Escape" && open) {
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
      return;
    }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    if (!open) {
      setOpen(true);
      requestAnimationFrame(() => menuRef.current?.querySelector("button")?.focus());
      return;
    }
    const menuOptions = Array.from(menuRef.current?.querySelectorAll("button") || []);
    const currentIndex = menuOptions.indexOf(document.activeElement);
    const direction = event.key === "ArrowDown" ? 1 : -1;
    const nextIndex = currentIndex < 0
      ? (direction > 0 ? 0 : menuOptions.length - 1)
      : (currentIndex + direction + menuOptions.length) % menuOptions.length;
    menuOptions[nextIndex]?.focus();
  };

  return (
    <div className="history-status-filter" ref={containerRef} onKeyDown={handleKeyDown}>
      <button
        className="history-status-trigger"
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="history-status-options"
        onClick={() => setOpen((isOpen) => !isOpen)}
      >
        <span>{selectedOption.label}</span>
        <svg aria-hidden="true" viewBox="0 0 20 20"><path d="m5 7.5 5 5 5-5" /></svg>
      </button>
      {open && <div className="history-status-options" id="history-status-options" role="menu" aria-label="تصفية حسب الحالة" ref={menuRef}>
        {options.map((option) => (
          <button
            className={option.value === value ? "selected" : ""}
            type="button"
            role="menuitemradio"
            aria-checked={option.value === value}
            key={option.value}
            onClick={() => {
              onChange(option.value);
              setOpen(false);
              triggerRef.current?.focus();
            }}
          >
            <span>{option.label}</span>
            {option.value === value && <span className="history-status-check" aria-hidden="true">✓</span>}
          </button>
        ))}
      </div>}
    </div>
  );
}

function Dashboard({ page, theme, onToggleTheme }) {
  const [orders, setOrders] = useState([]);
  const [historyDate, setHistoryDate] = useState(() => localDateKey(new Date()));
  const [historySearch, setHistorySearch] = useState("");
  const [historyStatus, setHistoryStatus] = useState("all");
  const historyDateInputRef = useRef(null);
  const accountMenuRef = useRef(null);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [business, setBusiness] = useState(null);
  const [invoice, setInvoice] = useState("");
  const [minutes, setMinutes] = useState(10);
  const [message, setMessage] = useState("");
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [messageType, setMessageType] = useState("");
  const [updatingOrderId, setUpdatingOrderId] = useState("");
  const [qrPoster, setQrPoster] = useState("");
  const [qrError, setQrError] = useState("");
  const [loading, setLoading] = useState(true);
  const load = async () => {
    try {
      const [nextOrders, account] = await Promise.all([api("/api/orders"), api("/api/auth/me")]);
      setOrders(nextOrders);
      setBusiness(account);
      setLoadError("");
    } catch (error) {
      setLoadError(localizeError(error.message));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    const updateConnection = () => setIsOnline(navigator.onLine);
    window.addEventListener("online", updateConnection);
    window.addEventListener("offline", updateConnection);
    return () => {
      window.removeEventListener("online", updateConnection);
      window.removeEventListener("offline", updateConnection);
    };
  }, []);
  useEffect(() => {
    if (!accountMenuOpen) return undefined;
    const closeOnOutsideClick = (event) => {
      if (!accountMenuRef.current?.contains(event.target)) setAccountMenuOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key !== "Escape") return;
      setAccountMenuOpen(false);
      accountMenuRef.current?.querySelector(".account-menu-trigger")?.focus();
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [accountMenuOpen]);
  useEffect(() => {
    load();
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const waitingOrders = orders
    .filter((o) => o.status === "waiting")
    .sort((a, b) => new Date(a.readyAt).getTime() - new Date(b.readyAt).getTime());
  const today = localDateKey(new Date());
  const historyForDay = orders.filter((order) => localDateKey(order.createdAt) === historyDate);
  const historyReadyCount = historyForDay.filter((order) => order.status === "ready").length;
  const historyWaitingCount = historyForDay.length - historyReadyCount;
  const visibleHistory = historyForDay
    .filter((order) => historyStatus === "all" || order.status === historyStatus)
    .filter((order) => String(order.invoice).toLowerCase().includes(historySearch.trim().toLowerCase()))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const add = async (e) => {
    e.preventDefault();
    try {
      await api("/api/orders", { method: "POST", body: JSON.stringify({ invoice, minutes }) });
      setInvoice("");
      setMessage("تمت إضافة الطلب إلى القائمة.");
      setMessageType("success");
      load();
    } catch (err) {
      setMessage(localizeError(err.message));
      setMessageType("error");
    }
  };
  const markOrderReady = async (id) => {
    setUpdatingOrderId(id);
    try {
      const updatedOrder = await api(`/api/orders/${id}/ready`, { method: "POST" });
      setOrders((current) => current.map((order) => order._id === id ? updatedOrder : order));
    } catch (error) {
      setLoadError(localizeError(error.message));
    } finally {
      setUpdatingOrderId("");
    }
  };
  const extendOrderTime = async (id) => {
    setUpdatingOrderId(id);
    try {
      const updatedOrder = await api(`/api/orders/${id}/extend`, {
        method: "POST",
        body: JSON.stringify({ minutes: 5 }),
      });
      setOrders((current) => current.map((order) => order._id === id ? updatedOrder : order));
    } catch (error) {
      setLoadError(localizeError(error.message));
    } finally {
      setUpdatingOrderId("");
    }
  };
  const changePassword = async (event) => {
    event.preventDefault();
    setPasswordMessage("");
    setPasswordError("");
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("كلمتا المرور غير متطابقتين.");
      return;
    }
    try {
      await api("/api/auth/password", {
        method: "POST",
        body: JSON.stringify({ currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword }),
      });
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setBusiness((account) => ({ ...account, hasPassword: true }));
      setPasswordMessage("تم تغيير كلمة المرور");
    } catch (error) {
      setPasswordError(localizeError(error.message));
    }
  };
  const updateBusiness = (updated) => setBusiness((account) => ({ ...account, ...updated }));
  const renderQueueRows = (queue) => queue.length ? queue.map((order) => {
    const secondsUntilReady = Math.ceil((new Date(order.readyAt).getTime() - now) / 1000);
    const overdue = secondsUntilReady <= 0;
    const displayedSeconds = Math.abs(secondsUntilReady);
    const displayedTime = `${String(Math.floor(displayedSeconds / 60)).padStart(2, "0")}:${String(displayedSeconds % 60).padStart(2, "0")}`;
    return (
      <div className="order-row" key={order._id}>
        <div className="order-number">#{order.invoice}</div>
        <div className="order-time">{order.createdAt ? <>وقت التسجيل: {new Date(order.createdAt).toLocaleTimeString("ar-TN", { hour: "numeric", minute: "2-digit" })}</> : "—"}</div>
        <div className={`order-status ${overdue ? "overdue" : ""}`}>
          <i className="status-pip" />
          <span>{overdue ? "متأخر عن الموعد" : "قيد التحضير"}<br /><strong dir="ltr">{overdue ? "متأخر" : "باقي"} {displayedTime}</strong></span>
        </div>
        <div className="order-actions">
          <button
            className="extend-button"
            disabled={updatingOrderId === order._id}
            onClick={() => extendOrderTime(order._id)}
          >
            {updatingOrderId === order._id ? "جارٍ التحديث…" : "إضافة 5 دقائق"}
          </button>
          <button
            className="ready-button"
            disabled={updatingOrderId === order._id}
            onClick={() => markOrderReady(order._id)}
          >
            {updatingOrderId === order._id ? "جارٍ التحديث…" : "جاهز للاستلام"}
          </button>
        </div>
      </div>
    );
  }) : <div className="empty-state"><p>{loading ? "جارٍ تحميل الطلبات…" : "لا توجد طلبات في الانتظار حالياً."}</p></div>;
  const qr = business ? `${window.location.origin}/?customer&business=${business.publicCode}&shop=${encodeURIComponent(business.name)}` : "";
  useEffect(() => {
    setQrPoster("");
    setQrError("");
    if (!qr || !business?.name) return undefined;
    let active = true;
    createBusinessQrPoster(qr, business.name)
      .then((poster) => {
        if (active) {
          setQrPoster(poster);
          setQrError("");
        }
      })
      .catch((error) => {
        console.error("Could not generate the business QR poster:", error);
        if (active) setQrError("تعذّر إنشاء رمز QR. أعد تحميل الصفحة وحاول مجدداً.");
      });
    return () => { active = false; };
  }, [qr, business?.name]);
  const pageInfo = {
    qr: { eyebrow: "", title: "ملصق QR", copy: "اطبع الملصق وضعه عند الكاونتر، والزبون يمسحه ويتابع طلبه." },
    orders: { eyebrow: "إدارة الطلبات", title: "إضافة طلب", copy: "سجّل طلباً جديداً وتابع الطلبات النشطة من المكان نفسه." },
    dashboard: { eyebrow: "سجل الطلبات", title: "تاريخ طلباتك", copy: "اختر أي يوم لمراجعة الطلبات المسجلة فيه، وتابع حالتها بسرعة." },
    settings: { eyebrow: "حسابك", title: "الإعدادات", copy: "راجع بيانات نشاطك وحدّث كلمة مرور حسابك." },
  }[page];

  return (
    <div className="app-shell">
      <header className="topbar">
        <Logo />
        <nav className="app-nav" aria-label="التنقل الرئيسي">
          <a className={page === "orders" ? "selected" : ""} href="#orders">الطلبات</a>
          <a className={page === "dashboard" ? "selected" : ""} href="#dashboard">سجل الطلبات</a>
          <a className={page === "qr" ? "selected" : ""} href="#qr">رمز QR</a>
          <a className={page === "settings" ? "selected" : ""} href="#settings">الإعدادات</a>
        </nav>
        <div className="topbar-right">
          <div className="account-menu" ref={accountMenuRef}>
            <button
              className="account-menu-trigger"
              type="button"
              aria-label={`قائمة حساب ${business?.name || "النشاط التجاري"}`}
              aria-expanded={accountMenuOpen}
              aria-controls="account-menu-popover"
              onClick={() => setAccountMenuOpen((open) => !open)}
            >
              <span className="account-menu-caret" aria-hidden="true">⌄</span>
              <span className="account-menu-trigger-name" dir="auto">{business?.name || "النشاط التجاري"}</span>
              <span className="account-menu-avatar">
                {business?.logoUrl
                  ? <img src={business.logoUrl} alt="" />
                  : <span aria-hidden="true">{business?.name?.trim().charAt(0) || "✦"}</span>}
                <i className={isOnline ? "" : "offline"} aria-hidden="true" />
              </span>
            </button>
            {accountMenuOpen && <div className="account-menu-popover" id="account-menu-popover">
              <div className="account-menu-profile">
                <span className="account-menu-avatar account-menu-avatar-large">
                  {business?.logoUrl
                    ? <img src={business.logoUrl} alt="" />
                    : <span aria-hidden="true">{business?.name?.trim().charAt(0) || "✦"}</span>}
                  <i className={isOnline ? "" : "offline"} aria-hidden="true" />
                </span>
                <span className="account-menu-profile-copy">
                  <strong dir="auto">{business?.name || "النشاط التجاري"}</strong>
                  <small dir="auto">{business?.email || ""}</small>
                </span>
              </div>
              <a className="account-menu-item" href="#settings" onClick={() => setAccountMenuOpen(false)}>
                <span aria-hidden="true">⚙</span> الإعدادات
              </a>
              <div className="account-menu-theme">
                <span><span aria-hidden="true">{theme === "light" ? "☀" : "☾"}</span> المظهر: {theme === "light" ? "فاتح" : "داكن"}</span>
                <ThemeToggle theme={theme} onToggle={onToggleTheme} />
              </div>
              <a className="account-menu-item" href={`https://wa.me/21625193066?text=${encodeURIComponent("مرحباً، أحتاج إلى مساعدة بخصوص حسابي.")}`} target="_blank" rel="noreferrer" onClick={() => setAccountMenuOpen(false)}>
                <span aria-hidden="true">☏</span> الدعم عبر واتساب
              </a>
              <button
                className="account-menu-item account-menu-logout"
                type="button"
                onClick={() => { removeStoredValue(localStorage, "taw_ijyk_token", "dorak_token"); window.location.hash = "#login"; }}
              >
                <span aria-hidden="true">↩</span> تسجيل الخروج
              </button>
            </div>}
          </div>
        </div>
      </header>
      <main className={page === "settings" ? "settings-page" : ""}>
        <section className="hero">
          <div>
            {page !== "settings" && page !== "qr" && <p className="eyebrow">{pageInfo.eyebrow}</p>}
            <h1>{pageInfo.title}</h1>
            <p className="hero-copy">{pageInfo.copy}</p>
          </div>
          {page === "orders" && <div className="hero-stat">
            <span>في الانتظار</span>
            <strong>{waitingOrders.length}</strong>
          </div>}
        </section>
        {loadError && <div className="server-alert"><strong>تعذّر الاتصال</strong><span>{loadError}</span><button onClick={load}>حاول مجدداً</button></div>}
        {page === "qr" && <section className="single-page">
          <div className="panel qr-panel">
            {qrPoster ? <img className="qr-poster-image" src={qrPoster} alt={`ملصق رمز متابعة الطلبات لنشاط ${business?.name || ""}`} /> : <div className="qr-placeholder">{qrError || "جارٍ تجهيز رمز QR..."}</div>}
            <div className="qr-actions">
              <a className={`primary-button qr-download${qrPoster ? "" : " is-disabled"}`} href={qrPoster || undefined} download={`taw-ijyk-${(business?.name || "business").replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-").slice(0, 60)}-qr.png`} aria-disabled={!qrPoster} onClick={(event) => { if (!qrPoster) event.preventDefault(); }}>تنزيل الرمز للطباعة <span>↓</span></a>
              <a className={`secondary-button${qr ? "" : " is-disabled"}`} href={qr || undefined} aria-disabled={!qr} onClick={(event) => { if (!qr) event.preventDefault(); }}>افتح صفحة متابعة الطلب <span>↖</span></a>
            </div>
            <p className="qr-print-note">سيتم تنزيل صورة PNG عالية الدقة جاهزة للطباعة.</p>
          </div>
        </section>}
        {page === "orders" && business && !hasActiveSubscription(business) && <section className="single-page">
          <div className="panel subscription-lock-card" role="status">
            <span className="subscription-lock-icon" aria-hidden="true">✦</span>
            <p className="eyebrow">الاشتراك مطلوب</p>
            <h2>فعّل اشتراكك لإدارة الطلبات</h2>
            <p>صفحة الطلبات متاحة للحسابات ذات الاشتراك الفعّال. تواصل معنا لتفعيل اشتراكك أو تجديده.</p>
            <a className="whatsapp-button" href={`https://wa.me/21625193066?text=${encodeURIComponent("مرحباً، أحتاج إلى تفعيل اشتراك حسابي.")}`} target="_blank" rel="noreferrer">تواصل معنا</a>
          </div>
        </section>}
        {page === "orders" && hasActiveSubscription(business) && <>
          <section className="single-page">
            <div className="panel">
            <div className="panel-heading">
              <div><p className="eyebrow">طلب جديد</p><h2>أضف طلباً للقائمة</h2></div>
              <span className="step-label">طلب جديد</span>
            </div>
            <form onSubmit={add}>
              <label htmlFor="invoice-number">رقم الفاتورة</label>
              <div className="input-wrap invoice-input"><span>#</span><input id="invoice-number" dir="ltr" inputMode="numeric" placeholder="مثال: 112" value={invoice} onChange={(e) => setInvoice(e.target.value)} required /></div>
              <div className="field-row">
                <div>
                  <label htmlFor="ready-minutes">الوقت المتوقع</label>
                  <div className="input-wrap"><input id="ready-minutes" type="number" min="1" max="180" value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} /><span>دقيقة</span></div>
                  <div className="time-presets">{[5, 10, 15, 20].map((n) => <button type="button" className={minutes === n ? "selected" : ""} onClick={() => setMinutes(n)} key={n}>{n} دق</button>)}</div>
                </div>
                <div className="tip"><span className="tip-icon">i</span><span>يدخل الزبون رقم الفاتورة نفسه لمتابعة طلبه.</span></div>
              </div>
              <button className="primary-button" disabled={loading}>إضافة الطلب <span>←</span></button>
              <p className={`form-message${messageType ? ` ${messageType}` : ""}`}>{message}</p>
            </form>
            </div>
          </section>
          <section className="queue-section">
          <div className="queue-stage">
            <div className="queue-stage-heading"><div><p className="eyebrow">قيد التحضير</p><h2>في الانتظار</h2></div><span className="queue-count">{waitingOrders.length}</span></div>
            <div className="queue-list">{renderQueueRows(waitingOrders)}</div>
          </div>
          </section>
        </>}
        {page === "dashboard" && <section className="queue-section history-section">
          <div className="history-toolbar">
            <div className="history-day-heading">
              <p className="eyebrow">عرض اليوم</p>
              <h2>{formatHistoryDate(historyDate)}</h2>
            </div>
            <div className="history-date-controls" aria-label="اختيار يوم السجل">
              <button type="button" className="history-day-step" aria-label="اليوم السابق" title="اليوم السابق" onClick={() => setHistoryDate((date) => shiftDate(date, -1))}>→</button>
              <div className="history-date-input">
                <button
                  type="button"
                  className="history-date-trigger"
                  aria-label={`اختر تاريخ سجل الطلبات، التاريخ الحالي ${historyDate.split("-").reverse().join("/")}`}
                  onClick={() => {
                    const input = historyDateInputRef.current;
                    if (typeof input?.showPicker === "function") input.showPicker();
                    else {
                      input?.focus();
                      input?.click();
                    }
                  }}
                >
                  <span className="history-date-value" dir="ltr">{historyDate.split("-").reverse().join("/")}</span>
                  <svg aria-hidden="true" viewBox="0 0 20 20"><rect x="3" y="5" width="14" height="12" rx="2" /><path d="M6.5 3v4M13.5 3v4M3 9h14" /></svg>
                  <span className="history-date-label">التاريخ</span>
                </button>
                <input ref={historyDateInputRef} type="date" value={historyDate} max={today} onChange={(event) => setHistoryDate(event.target.value)} aria-label="اختر تاريخ سجل الطلبات" tabIndex={-1} />
              </div>
              <button type="button" className="history-day-step" aria-label="اليوم التالي" title="اليوم التالي" disabled={historyDate >= today} onClick={() => setHistoryDate((date) => shiftDate(date, 1))}>←</button>
              <button type="button" className="history-today-button" disabled={historyDate === today} onClick={() => setHistoryDate(today)}>اليوم</button>
            </div>
          </div>
          <div className="history-stats" aria-label="ملخص طلبات اليوم">
            <div className="history-stat-card">
              <span className="history-stat-icon">▤</span>
              <div><span>إجمالي الطلبات</span><strong>{historyForDay.length}</strong></div>
            </div>
            <div className="history-stat-card">
              <span className="history-stat-icon ready">✓</span>
              <div><span>جاهزة للاستلام</span><strong>{historyReadyCount}</strong></div>
            </div>
            <div className="history-stat-card">
              <span className="history-stat-icon waiting">◷</span>
              <div><span>قيد التحضير</span><strong>{historyWaitingCount}</strong></div>
            </div>
          </div>
          <div className="history-list-panel">
            <div className="history-list-heading">
              <div><p className="eyebrow">تفاصيل اليوم</p><h2>الطلبات <span>{visibleHistory.length}</span></h2></div>
              <div className="history-filters">
                <label className="history-search">
                  <span className="visually-hidden">ابحث برقم الفاتورة</span>
                  <input type="search" value={historySearch} onChange={(event) => setHistorySearch(event.target.value)} placeholder="ابحث برقم الفاتورة" />
                  <span aria-hidden="true">⌕</span>
                </label>
                <HistoryStatusFilter value={historyStatus} onChange={setHistoryStatus} />
              </div>
            </div>
          <div className="history-list">
            {visibleHistory.length ? visibleHistory.map((order) => {
              const statusLabel = order.status === "waiting" ? "قيد الانتظار" : "جاهز للاستلام";
              const isReady = order.status !== "waiting";
              return (
                <div className="history-row" key={order._id}>
                  <div className="order-number">#{order.invoice}</div>
                  <time className="history-time" dateTime={order.createdAt || undefined}>
                    {order.createdAt ? new Date(order.createdAt).toLocaleString("ar-TN", { dateStyle: "medium", timeStyle: "short" }) : "وقت التسجيل غير متوفر"}
                  </time>
                  <div className={`order-status${isReady ? " ready" : ""}`}><i className={`status-pip ${isReady ? "ready" : ""}`} />{statusLabel}</div>
                </div>
              );
            }) : <div className="empty-state"><span>✦</span><p>{loading ? "جارٍ تحميل سجل الطلبات…" : historyForDay.length ? "لا توجد طلبات تطابق البحث أو الحالة المحددة." : "لا توجد طلبات مسجلة في هذا اليوم."}</p></div>}
          </div>
          </div>
        </section>}
        {page === "settings" && <section className="settings-grid">
          <div className="panel account-panel">
            <div className="panel-heading">
              <div><p className="eyebrow">معلومات الحساب</p><h2>بيانات النشاط</h2></div>
            </div>
            <div className="account-details">
              <EditableAccountField field="name" label="اسم النشاط التجاري" value={business?.name} onSaved={updateBusiness} />
              <BusinessLogoField logoUrl={business?.logoUrl || ""} onSaved={updateBusiness} />
              <EditableAccountField field="phone" label="رقم الهاتف" value={business?.phone} onSaved={updateBusiness} />
              <BusinessReviewLinkField value={business?.googleReviewUrl || ""} onSaved={updateBusiness} />
              <div className="account-detail"><span>البريد الإلكتروني</span><strong dir="ltr">{business?.email || "—"}</strong><small>للتغيير، تواصل معنا.</small></div>
            </div>
          </div>
          <div className="panel account-panel">
            <div className="panel-heading">
              <div><p className="eyebrow">الأمان</p><h2>تغيير كلمة المرور</h2></div>
            </div>
            <form onSubmit={changePassword}>
              {business?.hasPassword && <PasswordField id="current-password" label="كلمة المرور الحالية" autoComplete="current-password" value={passwordForm.currentPassword} onChange={(event) => setPasswordForm({ ...passwordForm, currentPassword: event.target.value })} />}
              <PasswordField id="new-password" label="كلمة المرور الجديدة" autoComplete="new-password" minLength="8" value={passwordForm.newPassword} onChange={(event) => setPasswordForm({ ...passwordForm, newPassword: event.target.value })} />
              <PasswordField id="confirm-password" label="تأكيد كلمة المرور الجديدة" autoComplete="new-password" minLength="8" value={passwordForm.confirmPassword} onChange={(event) => setPasswordForm({ ...passwordForm, confirmPassword: event.target.value })} />
              <p className="muted password-hint">يجب أن تتكون كلمة المرور من 8 أحرف على الأقل.</p>
              <button className="primary-button">حفظ كلمة المرور <span>←</span></button>
              <p className={`form-message${passwordError ? " has-error" : passwordMessage ? " success" : ""}`}>{passwordError || passwordMessage}</p>
            </form>
          </div>
        </section>}
        {page === "settings" && <section className="account-summary panel" aria-label="حالة الحساب والدعم">
          <div className="summary-item">
            <span>حالة الحساب</span>
            <strong className={`subscription-badge ${hasActiveSubscription(business) ? "is-active" : "is-inactive"}`}>
              {hasActiveSubscription(business) ? "اشتراك فعّال" : "غير مفعّل"}
            </strong>
            {business?.subscriptionExpiresAt && <small className="subscription-expiry">ينتهي في {new Date(business.subscriptionExpiresAt).toLocaleDateString("ar-TN")}</small>}
          </div>
          <div className="summary-item">
            <span>الدعم</span>
            <a className="whatsapp-button" href={`https://wa.me/21625193066?text=${encodeURIComponent("مرحباً، أحتاج إلى مساعدة بخصوص حسابي.")}`} target="_blank" rel="noreferrer">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 11.7a8.3 8.3 0 0 1-12.3 7.2L3 20l1.2-5a8.3 8.3 0 1 1 16.3-3.3Z" /><path d="M8.2 7.8c.3-.5.6-.5.9-.5h.5c.2 0 .4.1.5.4l.8 1.8c.1.2.1.4-.1.6l-.6.7c-.2.2-.2.4 0 .6.4.7 1.2 1.5 2.1 1.9.2.1.4.1.6-.1l.8-.9c.2-.2.4-.2.6-.1l1.7.8c.2.1.3.3.3.5 0 .4-.2 1.2-.7 1.6-.5.5-1.1.7-1.9.6-1.1-.1-2.5-.7-3.9-2-1.6-1.4-2.5-3.1-2.7-4.1-.2-.9.2-1.5.7-1.8Z" /></svg>
              تواصل معنا
            </a>
          </div>
        </section>}
      </main>
      <footer><span className="brand-mini">✦</span> توا يجيك — طلبك علينا، ووقتك ليك.</footer>
    </div>
  );
}

function Customer({ token: publicToken, theme, onToggleTheme }) {
  const [order, setOrder] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [soundAlerting, setSoundAlerting] = useState(false);
  const [soundLoading, setSoundLoading] = useState(false);
  const [soundError, setSoundError] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState("");
  const audioContextRef = useRef(null);
  const audioBufferRef = useRef(null);
  const audioSourceRef = useRef(null);
  const soundEnabledRef = useRef(false);
  const soundAlertingRef = useRef(false);
  const previousOrderRef = useRef(null);
  const customerParams = new URLSearchParams(window.location.search);
  const businessCode = customerParams.get("business") || "";
  const shopNameFromQr = customerParams.get("shop") || "";
  const invoiceStorageKey = businessCode ? `taw_ijyk_customer_invoice_${businessCode}` : "";
  const legacyInvoiceStorageKey = businessCode ? `dorak_customer_invoice_${businessCode}` : "";
  const [invoice, setInvoice] = useState(() => invoiceStorageKey
    ? getStoredValue(localStorage, invoiceStorageKey, legacyInvoiceStorageKey)
    : "");
  const [businessName, setBusinessName] = useState(shopNameFromQr);
  const [businessLogoUrl, setBusinessLogoUrl] = useState("");
  const [businessReviewUrl, setBusinessReviewUrl] = useState("");
  const [businessError, setBusinessError] = useState("");
  const [error, setError] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const find = async (value) => {
    setLookupLoading(true);
    try {
      const response = await fetch(`/api/public/orders?invoice=${encodeURIComponent(value)}&business=${encodeURIComponent(businessCode)}`);
      const data = await readJson(response);
      if (!response.ok) throw new Error(data.error || arabicErrors["We can’t find that order."]);
      setOrder(data);
      setInvoice(data.invoice);
      if (invoiceStorageKey) localStorage.setItem(invoiceStorageKey, data.invoice);
      setError("");
    } catch (e) {
      setError(localizeCustomerError(e));
    } finally {
      setLookupLoading(false);
    }
  };
  const findToken = async (value) => {
    try {
      const response = await fetch(`/api/public/orders/${encodeURIComponent(value)}?business=${encodeURIComponent(businessCode)}`);
      const data = await readJson(response);
      if (!response.ok) throw new Error(data.error || arabicErrors["We can’t find that order."]);
      setOrder(data);
      setInvoice(data.invoice);
      if (invoiceStorageKey) localStorage.setItem(invoiceStorageKey, data.invoice);
      setError("");
    } catch (e) {
      setError(localizeCustomerError(e));
    }
  };
  useEffect(() => {
    if (!businessCode) return;
    fetch(`/api/public/business?business=${encodeURIComponent(businessCode)}`)
      .then(async (response) => {
        const data = await readJson(response);
        if (!response.ok) throw new Error(data.error || arabicErrors["Business not found."]);
        if (!shopNameFromQr) setBusinessName(data.name);
        setBusinessLogoUrl(data.logoUrl || "");
        setBusinessReviewUrl(data.googleReviewUrl || "");
      })
      .catch(() => {
        if (!shopNameFromQr) setBusinessError("اسم المحل غير متوفر. حدّث رمز QR من لوحة التحكم.");
      });
  }, [businessCode, shopNameFromQr]);
  useEffect(() => {
    if (publicToken) findToken(publicToken);
    else if (invoice) find(invoice);
  }, [publicToken, businessCode]);
  useEffect(() => {
    if (!order) return;
    const timer = setInterval(() => findToken(order.publicToken), 2000);
    return () => clearInterval(timer);
  }, [order?.publicToken]);
  const stopCustomerAlert = () => {
    soundAlertingRef.current = false;
    setSoundAlerting(false);
    if (audioSourceRef.current) {
      audioSourceRef.current.stop();
      audioSourceRef.current.disconnect();
      audioSourceRef.current = null;
    }
  };
  const startCustomerAlert = () => {
    if (!soundEnabledRef.current || soundAlertingRef.current) return;
    try {
      const audioContext = audioContextRef.current;
      const audioBuffer = audioBufferRef.current;
      if (!audioContext || !audioBuffer || audioContext.state !== "running") {
        throw new Error("Audio is not available.");
      }
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.loop = true;
      source.connect(audioContext.destination);
      source.onended = () => {
        if (audioSourceRef.current === source) audioSourceRef.current = null;
      };
      source.start();
      audioSourceRef.current = source;
      soundAlertingRef.current = true;
      setSoundAlerting(true);
      setSoundError("");
    } catch {
      soundEnabledRef.current = false;
      setSoundEnabled(false);
      setSoundError("تعذّر تشغيل التنبيه الصوتي. أعد تفعيله للمحاولة مجدداً.");
    }
  };
  useEffect(() => {
    if (!order) {
      previousOrderRef.current = null;
      return;
    }
    const previousOrder = previousOrderRef.current;
    if (previousOrder?.publicToken === order.publicToken) {
      const becameReady = previousOrder.status === "waiting" && order.status !== "waiting";
      const timeWasExtended = previousOrder.status === "waiting"
        && order.status === "waiting"
        && new Date(previousOrder.readyAt).getTime() !== new Date(order.readyAt).getTime();
      if (becameReady) {
        setAlertType("ready");
        setAlertMessage("طلبك جاهز الآن! تفضّل لاستلامه من المحاسبة.");
      } else if (timeWasExtended) {
        setAlertType("extended");
        const addedMinutes = Math.round(
          (new Date(order.readyAt).getTime() - new Date(previousOrder.readyAt).getTime()) / 60000,
        );
        setAlertMessage(
          addedMinutes > 0
            ? `الموظف أضاف ${addedMinutes} ${addedMinutes === 1 ? "دقيقة" : "دقائق"} إلى وقت الانتظار. الوقت المتوقع الجديد ${new Date(order.readyAt).toLocaleTimeString("ar-TN", { hour: "2-digit", minute: "2-digit" })}.`
            : `تم تحديث الوقت المتوقع للطلب إلى ${new Date(order.readyAt).toLocaleTimeString("ar-TN", { hour: "2-digit", minute: "2-digit" })}.`,
        );
      }
      if ((becameReady || timeWasExtended) && soundEnabledRef.current) {
        startCustomerAlert();
      }
    }
    previousOrderRef.current = order;
  }, [order]);
  useEffect(() => () => {
    soundEnabledRef.current = false;
    if (audioSourceRef.current) audioSourceRef.current.stop();
    if (audioContextRef.current && audioContextRef.current.state !== "closed") audioContextRef.current.close();
  }, []);
  const toggleSound = async () => {
    if (soundEnabled) {
      soundEnabledRef.current = false;
      setSoundEnabled(false);
      stopCustomerAlert();
      setSoundError("");
      return;
    }
    const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextConstructor) {
      setSoundError("متصفحك لا يدعم التنبيه الصوتي.");
      return;
    }
    setSoundLoading(true);
    try {
      if (!audioContextRef.current || audioContextRef.current.state === "closed") {
        audioContextRef.current = new AudioContextConstructor();
      }
      await audioContextRef.current.resume();
      if (audioContextRef.current.state !== "running") throw new Error("Audio is not available.");
      if (!audioBufferRef.current) {
        const response = await fetch("/newSound.wav");
        if (!response.ok) throw new Error("Could not load alert sound.");
        audioBufferRef.current = await audioContextRef.current.decodeAudioData(await response.arrayBuffer());
      }
      soundEnabledRef.current = true;
      setSoundEnabled(true);
      setSoundError("");
    } catch {
      soundEnabledRef.current = false;
      setSoundEnabled(false);
      setSoundError("تعذّر تحميل أو تفعيل الصوت. تحقق من الاتصال وحاول مجدداً.");
    } finally {
      setSoundLoading(false);
    }
  };
  const remaining = order ? new Date(order.readyAt).getTime() - Date.now() : 0;
  const display = `${String(Math.floor(Math.abs(remaining) / 60000)).padStart(2, "0")}:${String(Math.floor(Math.abs(remaining) / 1000) % 60).padStart(2, "0")}`;
  const soundControl = (
    <div className="customer-sound-control">
      <button type="button" className={soundEnabled ? "is-enabled" : ""} onClick={toggleSound} aria-pressed={soundEnabled} disabled={soundLoading}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10v4h4l5 4V6l-5 4H4Z" /><path d="M16 9a5 5 0 0 1 0 6m2-9a9 9 0 0 1 0 12" /></svg>
        {soundLoading ? "جارٍ تفعيل الصوت…" : soundEnabled ? "التنبيه الصوتي مفعّل" : "فعّل التنبيه الصوتي"}
      </button>
      <span>{soundAlerting ? "التنبيه يكرّر حتى توقفه" : "ننبّهك عند جهوز الطلب أو تغيير وقته"}</span>
      {soundError && <p role="status">{soundError}</p>}
    </div>
  );
  const alertNotice = alertMessage && (
    <div className={`customer-alert-message${alertType === "ready" ? " is-ready" : " is-extended"}`} role="status" aria-live="polite">
      <span className="customer-alert-message-icon" aria-hidden="true">{alertType === "ready" ? "✓" : "!"}</span>
      <span>{alertMessage}</span>
      {soundAlerting && <button type="button" className="customer-sound-stop" onClick={stopCustomerAlert}>إيقاف الصوت</button>}
    </div>
  );

  return (
    <main className="customer-page">
      <div className="customer-screen">
        <header className="customer-header">
          <Logo />
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
        </header>
        {!order ? (
          <div className="customer-card customer-entry-card">
            <section className="customer-welcome-panel" aria-label="ترحيب">
              <span className="customer-welcome-label"><span aria-hidden="true">✦</span> أهلاً بيك</span>
              <div className="customer-phone-scene" aria-hidden="true">
                <span className="customer-phone-orbit customer-phone-orbit-one" />
                <span className="customer-phone-orbit customer-phone-orbit-two" />
                <svg className="customer-phone" viewBox="0 0 180 300">
                  <defs>
                    <linearGradient id="customer-progress-ring" x1="44" x2="136" y1="107" y2="199" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#A477E8" />
                      <stop offset="1" stopColor="#53BCD1" />
                    </linearGradient>
                  </defs>
                  <rect x="17" y="5" width="146" height="286" rx="29" fill="#252444" />
                  <rect x="23" y="12" width="134" height="272" rx="24" fill="#FCFBFF" />
                  <rect x="70" y="21" width="40" height="5" rx="2.5" fill="#252444" opacity=".8" />
                  <text x="90" y="48" textAnchor="middle" fill="#6D6680" fontSize="7" fontWeight="700">طلبك رقم #1284</text>
                  <rect x="63" y="56" width="54" height="15" rx="7.5" fill="#EDF6F0" />
                  <circle cx="72" cy="63.5" r="2" fill="#56A77A" />
                  <text x="93" y="66" textAnchor="middle" fill="#4B8F68" fontSize="6.5" fontWeight="700">قيد التحضير</text>
                  <circle cx="90" cy="151" r="45" fill="none" stroke="#EBE8F4" strokeWidth="9" />
                  <circle className="customer-phone-ring-progress" cx="90" cy="151" r="45" fill="none" stroke="url(#customer-progress-ring)" strokeDasharray="214 283" strokeDashoffset="10" strokeLinecap="round" strokeWidth="9" transform="rotate(-90 90 151)" />
                  <text x="90" y="155" textAnchor="middle" fill="#292642" fontSize="19" fontWeight="800" letterSpacing="-.7">04:32</text>
                  <text x="90" y="207" textAnchor="middle" fill="#8A8298" fontSize="7" fontWeight="600">الوقت المتبقي</text>
                  <rect x="52" y="222" width="76" height="26" rx="9" fill="#8B70D0" />
                  <text x="90" y="238" textAnchor="middle" fill="#FFFFFF" fontSize="8" fontWeight="700">تابع طلبي</text>
                  <circle cx="67" cy="264" r="3" fill="#63BE9B" />
                  <rect x="74" y="262" width="41" height="4" rx="2" fill="#E5E2EC" />
                </svg>
                <div className="customer-phone-notice">
                  <span className="customer-phone-notice-icon">
                    <svg viewBox="0 0 24 24"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9m-8 12h4" /></svg>
                  </span>
                  <span className="customer-phone-notice-copy" dir="rtl">
                    <strong>تحديث جديد</strong>
                    <small>طلبك قيد التحضير</small>
                  </span>
                  <span className="customer-phone-notice-dot" />
                </div>
                <span className="customer-phone-spark customer-phone-spark-one">✦</span>
                <span className="customer-phone-spark customer-phone-spark-two">✦</span>
              </div>
              <div className="customer-welcome-copy">
                <p>خلي الباقي علينا</p>
                <span>طلبك ديما على بالنا، ونعلّموك كي يجهز.</span>
              </div>
              <div className="customer-welcome-note"><span aria-hidden="true">♡</span> لحظات وتعرف وين وصل</div>
            </section>
            <section className="customer-form-panel">
              <div className="customer-shop-header" dir="rtl">
                <div className="customer-shop-identity">
                  {businessLogoUrl
                    ? <img className="customer-shop-mark customer-shop-logo" src={businessLogoUrl} alt="" />
                    : <span className="customer-shop-mark" aria-hidden="true">{businessName.trim().charAt(0) || "T"}</span>}
                  <span className="customer-shop-copy">
                    <strong dir="auto">{businessName || "المحل"}</strong>
                    <small>متابعة الطلبات</small>
                  </span>
                </div>
                <span className="customer-live-status"><i />متابعة مباشرة</span>
              </div>
              {businessError && <p className="customer-business-error" role="status">{businessError}</p>}
              <div className="customer-entry-divider" />
              <p className="eyebrow">متابعة الطلب</p>
              <h1>وين وصل <em>طلبك؟</em></h1>
              <p className="customer-copy">امسح رمز المحاسبة أو أدخل رقم فاتورتك لمتابعة الطلب.</p>
              <form onSubmit={(e) => { e.preventDefault(); find(invoice); }}>
                <label htmlFor="customer-invoice">رقم الفاتورة</label>
                <div className="input-wrap invoice-input"><input id="customer-invoice" dir="ltr" inputMode="numeric" placeholder="1284" value={invoice} onChange={(e) => setInvoice(e.target.value)} required /></div>
                <p className="customer-invoice-hint">
                  <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 2.5h8l2.5 2.7v12.3H5z" /><path d="M13 2.5v3h2.5M7.5 9h5M7.5 12h5" /></svg>
                  الرقم مكتوب على فاتورتك
                </p>
                <button className={`primary-button${lookupLoading ? " is-loading" : ""}`} disabled={lookupLoading || !invoice.trim()} aria-busy={lookupLoading}>
                  تابع طلبي <span aria-hidden="true">{lookupLoading ? <i className="customer-button-spinner" /> : "←"}</span>
                </button>
              </form>
              <p className="not-found">{error}</p>
            </section>
          </div>
        ) : (
          <div className="customer-card">
          {order.status !== "waiting" ? (
            <div className="customer-status">
              <div className="status-icon">✦</div>
              <h2>طلبك جاهز للاستلام</h2>
              <p className="ready-message">تفضل باستلامه من المحاسبة.</p>
              {alertNotice}
              {soundControl}
              <ol className="customer-order-progress is-ready" aria-label="مراحل الطلب">
                <li className="is-complete"><span>✓</span><strong>استلام طلبك</strong></li>
                <li className="is-complete"><span>✓</span><strong>قيد التحضير</strong></li>
                <li className="is-complete"><span>✓</span><strong>جاهز</strong></li>
              </ol>
              {businessReviewUrl && <div className="customer-review-invitation">
                <p>يسعدنا أن تشاركنا رأيك على Google</p>
                <div className="customer-review-stars" dir="ltr" aria-label="تقييم النشاط على Google">
                  {Array.from({ length: 5 }, (_, index) => (
                    <a
                      key={index}
                      href={businessReviewUrl}
                      target="_blank"
                      rel="noreferrer"
                      aria-label="افتح صفحة تقييم Google"
                    >★</a>
                  ))}
                </div>
              </div>}
              {error && <p className="not-found" role="status">{error}</p>}
              <button className="secondary-button" onClick={() => setOrder(null)}>تابع طلباً آخر <span>←</span></button>
            </div>
          ) : (
            <div className="customer-status">
              <p className="eyebrow">طلب رقم #{order.invoice}</p>
              {alertNotice}
              <div className="countdown" dir="ltr">{remaining <= 0 ? "+" : ""}{display}</div>
              <h2>{remaining <= 0 ? "طلبك يحتاج وقتاً إضافياً" : "طلبك قيد التجهيز"}</h2>
              <p>{remaining <= 0 ? "تأخّر شوية، نعلّموك كي يجهز" : "سيكون طلبك جاهزاً قريباً."}<br />يمكنك إبقاء هذه الصفحة مفتوحة.</p>
              {soundControl}
              {error && <p className="not-found" role="status">{error}</p>}
              <ol className="customer-order-progress" aria-label="مراحل الطلب">
                <li className="is-complete"><span>✓</span><strong>استلام طلبك</strong></li>
                <li className="is-current" aria-current="step"><span>2</span><strong>قيد التحضير</strong></li>
                <li><span>3</span><strong>جاهز</strong></li>
              </ol>
              <button className="secondary-button" onClick={() => setOrder(null)}>تابع طلباً آخر <span>←</span></button>
            </div>
          )}
          </div>
        )}
        <p className="customer-footnote">توا يجيك — وقتك ليك.</p>
      </div>
    </main>
  );
}

function App() {
  const [route, setRoute] = useState(window.location.hash || "#login");
  const [theme, setTheme] = useState(() => getStoredValue(localStorage, "taw_ijyk_theme", "dorak_theme") === "light" ? "light" : "dark");
  const params = new URLSearchParams(window.location.search);
  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setStoredValue(localStorage, "taw_ijyk_theme", nextTheme, "dorak_theme");
    setTheme(nextTheme);
  };
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "light" ? "#efeff8" : "#070817");
  }, [theme]);
  useEffect(() => {
    const change = () => setRoute(window.location.hash || "#login");
    window.addEventListener("hashchange", change);
    return () => window.removeEventListener("hashchange", change);
  }, []);
  if (params.has("customer")) return <Customer token={params.get("customer")} theme={theme} onToggleTheme={toggleTheme} />;
  if (route === "#admin") return <Admin theme={theme} onToggleTheme={toggleTheme} />;
  if (["#qr", "#orders", "#dashboard", "#settings"].includes(route) && token()) {
    return <Dashboard page={route.slice(1)} theme={theme} onToggleTheme={toggleTheme} />;
  }
  return <Auth signup={route === "#signup"} theme={theme} onToggleTheme={toggleTheme} />;
}

createRoot(document.getElementById("root")).render(<AppErrorBoundary><App /></AppErrorBoundary>);
