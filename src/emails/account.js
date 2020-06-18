const sgMail = require("@sendgrid/mail");
const sendgriAPIKey =
  "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";

sgMail.setApiKey(sendgriAPIKey);

// const msg = {
//   to: "amitdgpghosh@gmail.com",
//   from: "amitdgpghosh@gmail.com",
//   subject: "My first creation!",
//   text: "How are you?",
// };

const sendWelcomeEmail = (name, email) => {
  sgMail.send({
    to: email,
    from: "amitdgpghosh@gmail.com",
    subject: "Welcome to EverChange",
    text: `Welcome to the app, ${name}. Please verify your email to continue.`,
  });
};

module.exports = {
  sendWelcomeEmail,
};
