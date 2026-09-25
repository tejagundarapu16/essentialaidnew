const nodemailer = require("nodemailer")

async function testGmail() {
  const username = "tejagundarapu9@gmail.com"
  const password = "tqnm ukmf hqca zrlo".replace(/\s+/g, "")

  console.log("Testing Gmail SMTP with username:", username)
  console.log("Cleaned password length:", password.length)

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: username,
      pass: password,
    },
  })

  try {
    console.log("Verifying SMTP connection...")
    await transporter.verify()
    console.log("✅ Gmail SMTP connection verified successfully!")

    console.log("Sending test mail...")
    const info = await transporter.sendMail({
      from: `"EssentialAid" <${username}>`,
      to: username,
      subject: "EssentialAid OTP Test Email",
      text: "This is a test email from EssentialAid OTP authentication system.",
      html: "<h3>EssentialAid OTP Test</h3><p>Your test OTP code is: <b>482913</b></p>",
    })

    console.log("✅ Mail sent! Message ID:", info.messageId)
  } catch (err) {
    console.error("❌ Gmail SMTP Error:", err)
  }
}

testGmail()
