const nodemailer = require("nodemailer");

let cachedTransporter = null;

function isEmailOtpEnabled() {
  return String(process.env.OTP_DELIVERY || "").toLowerCase() === "email";
}

function shouldExposeDevOtp() {
  return (
    process.env.NODE_ENV !== "production" &&
    String(process.env.OTP_SHOW_DEV_CODE || "false").toLowerCase() === "true"
  );
}

function getTransporter() {
  if (cachedTransporter) return cachedTransporter;

  cachedTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT || 465),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return cachedTransporter;
}


async function sendOtpEmail({ to, fullName, otp }) {
  const transporter = getTransporter();

  await transporter.sendMail({
    from:
      process.env.SMTP_FROM ||
      `Digital Evidence System <${process.env.SMTP_USER}>`,
    to,
    subject: "رمز التحقق - نظام الأدلة الرقمية",
    html: `
      <div dir="rtl" style="font-family:Tahoma;padding:20px">
        <h2>مرحباً ${fullName || ""}</h2>
        <p>رمز التحقق الخاص بك هو:</p>

        <div style="
          font-size:32px;
          font-weight:bold;
          background:#f3f4f6;
          padding:20px;
          border-radius:10px;
          text-align:center;
          letter-spacing:8px;
        ">
          ${otp}
        </div>

        <p>لا تشارك الرمز مع أي شخص.</p>
      </div>
    `,
  });
}

module.exports = {
  isEmailOtpEnabled,
  shouldExposeDevOtp,
  sendOtpEmail,
};