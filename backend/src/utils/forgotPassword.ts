import nodemailer from "nodemailer";

export const sendResetPasswordMail =
  async (
    email: string,
    resetLink: string
  ) => {

    const transporter =
      nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Reset Password",
      html: `
        <h2>Reset Password</h2>

        <p>
          Click below link to reset password
        </p>

        <a href="${resetLink}">
          Reset Password
        </a>

        <p>
          Link expires in 15 minutes.
        </p>
      `,
    });
  };