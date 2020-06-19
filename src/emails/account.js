const sgMail = require("@sendgrid/mail");
const sendgriAPIKey =
  "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";

sgMail.setApiKey(sendgriAPIKey);

const sendWelcomeEmail = (email, name, token) => {
  sgMail.send({
    to: email,
    from: "amit@amit-ghosh.com",
    subject: "Welcome to EverChange " + name,
    html: `<h2>Please verify your email to continue</h2>. <p>Click on the given link.</p>
    <a href="https://everchange-backend.herokuapp.com/users/authenticate/${token}">Verify Email</a>`,
  });
};

module.exports = { sendWelcomeEmail };
