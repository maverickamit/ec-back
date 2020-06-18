const sgMail = require("@sendgrid/mail");
const sendgriAPIKey =
  "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";

sgMail.setApiKey(sendgriAPIKey);

const sendWelcomeEmail = (email, name) => {
  sgMail.send({
    to: email,
    from: "amit@amit-ghosh.com",
    subject: "Welcome to EverChange " + name,
    text: "Please verify your emai to continue",
  });
};

module.exports = { sendWelcomeEmail };
