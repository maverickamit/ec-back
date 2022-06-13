//All routes related to User. ex: signup, login, avatar picture etc
const express = require("express");
const router = new express.Router();
const User = require("../models/user");
const auth = require("../middleware/auth");
const jwt = require("jsonwebtoken");
const { sendWelcomeEmail } = require("../emails/account");
const {
  sendPasswordResetEmail,
  sendSuccessfulResetEmail,
} = require("../emails/passwordResetEmail");

const multer = require("multer");
const sharp = require("sharp");
const bcrypt = require("bcryptjs");
const path = require("path");
const { options } = require("../charities");

require("dotenv").config();

//creating new user endpoint
router.post("/", async (req, res) => {
  const user = new User(req.body);
  try {
    await user.save();
    const emailToken = jwt.sign(
      {
        email: user.email,
      },
      process.env.JWT_EMAIL_VERIFY_SECRET,
      {
        expiresIn: "24 hours",
      }
    );
    sendWelcomeEmail(user.email, user.firstName, emailToken);
    const token = await user.generateAuthToken();
    res.status(201).send({
      user,
      token,
    });
  } catch (err) {
    res.status(400).send(err);
  }
});

const upload = multer({
  limits: {
    fileSize: 1000000,
  },
  fileFilter(req, file, cb) {
    if (!file.originalname.match(/\.(jpeg|jpg|png)$/)) {
      cb(new Error("File must be an image"));
    }

    cb(undefined, true);
  },
});

// Endpoint for setting avatar for user(profile picture)
router.post(
  "/me/avatar",
  auth,
  upload.single("avatar"),
  async (req, res) => {
    const buffer = await sharp(req.file.buffer)
      .resize({ width: 380, height: 380 })
      .png()
      .toBuffer();
    req.user.avatar = buffer;
    await req.user.save();
    res.send();
  },
  (error, req, res, next) => {
    res.status(400).send({ error: error.message });
  }
);

// Endpoint for deleting avatar for user(profile picture)
router.delete("/me/avatar", auth, async (req, res) => {
  req.user.avatar = undefined;
  await req.user.save();
  res.send();
});

//serving user avatar in an URL
router.get("/:id/avatar", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user || !user.avatar) {
      res.set("Content-Type", "image/png");
      res.sendFile(
        path.join(__dirname, "../../public/images/default_avatar.png")
      );
    } else {
      res.set("Content-Type", "image/png");
      res.send(user.avatar);
    }
  } catch (e) {
    res.status(404).send();
  }
});

//Endpoint for resend email verification
router.post("/authenticate", auth, async (req, res) => {
  try {
    const user = req.user;

    const emailToken = jwt.sign(
      {
        email: user.email,
      },
      process.env.JWT_EMAIL_VERIFY_SECRET,
      {
        expiresIn: "24 hours",
      }
    );
    sendWelcomeEmail(user.email, user.firstName, emailToken);
    res.send();
  } catch {
    res.status(500).send();
  }
});

//Endpoint for logging in user

router.post("/login", async (req, res) => {
  try {
    const user = await User.findByCredentials(
      req.body.email,
      req.body.password
    );
    const token = await user.generateAuthToken();
    res.status(200).send({
      user,
      token,
    });
  } catch (e) {
    res.status(404).send("Error: " + e);
  }
});

// Reading User Endpoint
//Getting a list of all U sers

// router.get("/", (req, res) => {
// User.find({})
// .then((users) => {
// res.send(users);
// })
// .catch((e) => {
// res.status(500).send();
// });
// });

//Endpoint for loggin out user from single session

router.post("/logout", auth, async (req, res) => {
  try {
    req.user.tokens = req.user.tokens.filter((token) => {
      return token.token !== req.token;
    });
    await req.user.save();
    res.send();
  } catch {
    res.status(500).send();
  }
});

//Endpoint for loggin out user from all other sessions

router.post("/logoutAll", auth, async (req, res) => {
  try {
    req.user.tokens = req.user.tokens.filter((token) => {
      return token.token === req.token;
    });
    await req.user.save();
    res.send();
  } catch {
    res.status(500).send();
  }
});

//Getting particular user details

router.get("/me", auth, (req, res) => {
  res.send(req.user);
});

//Updating User details

router.patch("/me", auth, async (req, res) => {
  // const _id = req.params.id;
  const body = req.body;
  const allowedUpdates = [
    "email",
    "password",
    "oldPassword",
    "firstName",
    "lastName",
    "billingAddress",
  ];
  const updatesUsed = Object.keys(body);
  const isValidOperation = updatesUsed.every((update) => {
    return allowedUpdates.includes(update);
  });

  try {
    const user = req.user;
    if (!user) {
      throw new Error();
    }

    //checking if provided old password is correct before updating
    const isPassWordValid = await bcrypt.compare(
      body.oldPassword,
      user.password
    );
    if (!isPassWordValid) {
      throw new Error("Invalid Password!");
    }
    if (!isValidOperation) {
      throw new Error("Invalid updates!");
    }

    updatesUsed.forEach((update) => {
      if (body[update] !== "" && body[update] !== user[update]) {
        user[update] = body[update];
      }
    });
    await user.save();
    res.send(user);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

//Deleting User

router.delete("/me", auth, async (req, res) => {
  try {
    await req.user.remove();
    res.send(user);
  } catch (e) {
    res.status(500).send(e);
  }
});

//Get list of charities

router.get("/charities", async (req, res) => {
  res.send(options);
});

//Updating Charity details

router.patch("/me/charity", auth, async (req, res) => {
  const body = req.body;
  try {
    const user = req.user;
    if (!user) {
      throw new Error();
    }
    user.currentCharity.id = body.charityId;
    await user.save();
    res.send(user);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

//Verifying Email

router.get("/authenticate/:token", async (req, res) => {
  try {
    const mytoken = req.params.token;
    const userEmail = jwt.verify(mytoken, process.env.JWT_EMAIL_VERIFY_SECRET);
    const user = await User.findOne({
      email: userEmail.email,
    });
    if (user) {
      user.emailVerified = true;
      await user.save();

      res.send(
        `<html>

<head>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <script src="https://code.jquery.com/jquery-3.2.1.slim.min.js"
    integrity="sha384-KJ3o2DKtIkvYIK3UENzmM7KCkRr/rE9/Qpg6aAZGJwFDMVNA/GpGFF93hXpG5KkN"
    crossorigin="anonymous"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/popper.js/1.12.9/umd/popper.min.js"
    integrity="sha384-ApNbgh9B+Y1QKtv3Rn7W3mgPxhU9K/ScQsAP7hUibX39j7fakFPskvXusvfa0b4Q"
    crossorigin="anonymous"></script>
  <script src="https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0/js/bootstrap.min.js"
    integrity="sha384-JZR6Spejh4U02d8jOt6vLEHfe/JQGiRRSQQxSfFWpi1MquVdAyjUar5+76PVCmYl"
    crossorigin="anonymous"></script>
  <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0/css/bootstrap.min.css"
    integrity="sha384-Gn5384xqQ1aoWXA+058RXPxPg6fy4IWvTNh0E263XmFcJlSAwiGgFAW/dAiS6JXm" crossorigin="anonymous" />
  <style>
    html,
    body {
      height: 100%;
    }

    nav {
      margin-bottom: 20px;
      min-height: 80px;
    }

    .nav-link,
    .navbar-brand {
      color: #007bff !important;
    }

    .message {
      padding-bottom: 50px;
    }
  </style>
</head>

<body>
  <div class="container bg-light">
    <nav class="navbar navbar-expand-lg navbar-light">
      <a class="navbar-brand" href="${process.env.CLIENT_APP_URL}/">EverChange</a>
      <button class="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarNav"
        aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
        <span class="navbar-toggler-icon"></span>
      </button>
      <div class="collapse navbar-collapse" id="navbarNav">
        <ul class="navbar-nav ml-auto">
          <li class="nav-item active">
            <a class="nav-link" href="${process.env.CLIENT_APP_URL}/">Login <span class="sr-only">(current)</span></a>
          </li>
          <li class="nav-item">
            <a class="nav-link" href="${process.env.CLIENT_APP_URL}/registration">Sign Up</a>
          </li>
        </ul>
      </div>
    </nav>
  </div>
  <div class="container bg-light">
    <div className="row ">
      <p class="font-weight-bold" style="padding: 10px">
        Your Email is Verified.
      </p>
      <p class="message" style="padding-left: 10px">
        Please click
        <a href=${process.env.CLIENT_APP_URL}>here</a>
        to continue to login.
      </p>
    </div>
  </div>
</body>

</html>`
      );
    }
  } catch (e) {
    res.status(500).send(`
<link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.0/css/bootstrap.min.css"
  integrity="sha384-9aIt2nRpC12Uk9gS9baDl411NQApFmC26EwAOH8WgZl5MYYxFfc+NcPb1dKGj7Sk" crossorigin="anonymous">
<div className="container">
  <div className="row">
    <p class="font-weight-bold " style="padding:20px;font-size:calc(100% + 1vh)">Error in verification.</p>
  </div>
</div>`);
  }
});

//Endpoint for handling forgot password
router.post("/forgotPassword", async (req, res) => {
  try {
    const email = req.body.email;
    const user = await User.findOne({
      email: email,
    });
    const resetToken = jwt.sign(
      {
        _id: user._id,
        email: user.email,
      },
      user.password + process.env.JWT_PASSWORD_RESET_SECRET,
      {
        expiresIn: "24 hours",
      }
    );
    sendPasswordResetEmail(user.email, user._id, resetToken);
    res.send();
  } catch {
    res.status(500).send();
  }
});

//Endpoint for handling password reset url
router.get("/forgotPassword/reset/:id/:token", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      throw new Error();
    }
    // const secret = user.password+"-forgotpasswordec"
    // const resetToken = jwt.decode(
    // req.params.token, secret
    // );
    res.send(
      `<html>

<head>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <script src="https://code.jquery.com/jquery-3.2.1.slim.min.js"
    integrity="sha384-KJ3o2DKtIkvYIK3UENzmM7KCkRr/rE9/Qpg6aAZGJwFDMVNA/GpGFF93hXpG5KkN"
    crossorigin="anonymous"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/popper.js/1.12.9/umd/popper.min.js"
    integrity="sha384-ApNbgh9B+Y1QKtv3Rn7W3mgPxhU9K/ScQsAP7hUibX39j7fakFPskvXusvfa0b4Q"
    crossorigin="anonymous"></script>
  <script src="https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0/js/bootstrap.min.js"
    integrity="sha384-JZR6Spejh4U02d8jOt6vLEHfe/JQGiRRSQQxSfFWpi1MquVdAyjUar5+76PVCmYl"
    crossorigin="anonymous"></script>
  <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0/css/bootstrap.min.css"
    integrity="sha384-Gn5384xqQ1aoWXA+058RXPxPg6fy4IWvTNh0E263XmFcJlSAwiGgFAW/dAiS6JXm" crossorigin="anonymous" />

  <style>
    html,
    body {
      height: 100%;
    }

    form {
      padding-top: 10px;
      font-size: 14px;
      margin-top: 30px;
    }

    .card-title {
      font-weight: 300;
      text-align: center;
      padding-top: 20px;
    }

    .btn {
      font-size: 14px;
      margin-top: 20px;
    }

    .sign-up {
      text-align: center;
      padding: 20px 0 0;
    }

    span {
      font-size: 14px;
    }

    /* Medium devices (landscape tablets, 768px and up) */
    @media only screen and (min-width: 768px) {
      .reset-form {
        width: 50vw;
      }
    }

    /* Large devices (laptops/desktops, 992px and up) */
    @media only screen and (min-width: 992px) {
      .reset-form {
        width: 40vw;
      }
    }

    /* Extra large devices (large laptops and desktops, 1200px and up) */
    @media only screen and (min-width: 1200px) {
      .reset-form {
        width: 30vw;
      }
    }

    nav {
      margin-bottom: 20px;
      min-height: 80px;
    }

    .nav-link,
    .navbar-brand {
      color: #007bff !important;
    }
  </style>
</head>

<body>
  <div class="container bg-light">
    <nav class="navbar navbar-expand-lg navbar-light">
      <a class="navbar-brand" href="${process.env.CLIENT_APP_URL}/">EverChange</a>
      <button class="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarNav"
        aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
        <span class="navbar-toggler-icon"></span>
      </button>
      <div class="collapse navbar-collapse" id="navbarNav">
        <ul class="navbar-nav ml-auto">
          <li class="nav-item active">
            <a class="nav-link" href="${process.env.CLIENT_APP_URL}/">Login <span class="sr-only">(current)</span></a>
          </li>
          <li class="nav-item">
            <a class="nav-link" href="${process.env.CLIENT_APP_URL}/registration">Sign Up</a>
          </li>
        </ul>
      </div>
    </nav>
  </div>

  <div class="container bg-light">
    <div class="reset-form mx-auto pb-3">
      <h2 class="card-title">Reset password</h2>
      <form class="login-form" action="/users/forgotPassword/reset" method="POST" oninput='pw2.setCustomValidity(pw2.value != pw.value ? "Passwords do not match." : "");
        pw.setCustomValidity(pw.value.length <8 ? "Please increase length of your password" : "")'>
        <div class="col">
          <div class="form-group">
            <label for="exampleInputEmail1">Enter new password</label>
            <input type="password" class="form-control form-control" required name="pw"
              placeholder="Greater than or equal to 8 characters" />
          </div>
          <div class="form-group">
            <label for="exampleInputEmail1">Retype new password</label>
            <input type="password" class="form-control form-control" placeholder="" name="pw2" />
          </div>
          <div class="form-group">
            <input type="hidden" name="id" value="${req.params.id}" />
          </div>
          <div class="form-group">
            <input type="hidden" name="token" value="${req.params.token}" />
          </div>
          <div class="form-group">
            <button type="submit" class="btn btn-primary btn-block">
              Reset
            </button>
          </div>
        </div>
      </form>
    </div>
  </div>
</body>

</html>
`
    );
  } catch (e) {
    res.status(500).send(`
<link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.0/css/bootstrap.min.css"
  integrity="sha384-9aIt2nRpC12Uk9gS9baDl411NQApFmC26EwAOH8WgZl5MYYxFfc+NcPb1dKGj7Sk" crossorigin="anonymous">
<div className="container">
  <div className="row">
    <p class="font-weight-bold " style="padding:20px;font-size:calc(100% + 1vh)">Error in verification.</p>
  </div>
</div>`);
  }
});

//Route to handle reset password submit form
router.post("/forgotPassword/reset", async (req, res) => {
  try {
    const user = await User.findById(req.body.id);
    if (!user) {
      throw new Error();
    }
    const secret = user.password + process.env.JWT_PASSWORD_RESET_SECRET;
    const payload = jwt.verify(req.body.token, secret);
    user.password = req.body.pw;
    await user.save();
    sendSuccessfulResetEmail(user.email, user.firstName);

    res.send(`<html>

<head>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <script src="https://code.jquery.com/jquery-3.2.1.slim.min.js"
    integrity="sha384-KJ3o2DKtIkvYIK3UENzmM7KCkRr/rE9/Qpg6aAZGJwFDMVNA/GpGFF93hXpG5KkN"
    crossorigin="anonymous"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/popper.js/1.12.9/umd/popper.min.js"
    integrity="sha384-ApNbgh9B+Y1QKtv3Rn7W3mgPxhU9K/ScQsAP7hUibX39j7fakFPskvXusvfa0b4Q"
    crossorigin="anonymous"></script>
  <script src="https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0/js/bootstrap.min.js"
    integrity="sha384-JZR6Spejh4U02d8jOt6vLEHfe/JQGiRRSQQxSfFWpi1MquVdAyjUar5+76PVCmYl"
    crossorigin="anonymous"></script>
  <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0/css/bootstrap.min.css"
    integrity="sha384-Gn5384xqQ1aoWXA+058RXPxPg6fy4IWvTNh0E263XmFcJlSAwiGgFAW/dAiS6JXm" crossorigin="anonymous" />

  <style>
    html,
    body {
      height: 100%;
    }

    nav {
      margin-bottom: 20px;
      min-height: 80px;
    }

    .nav-link,
    .navbar-brand {
      color: #007bff !important;
    }

    .message {
      padding-bottom: 50px;
    }
  </style>
</head>

<body>
  <div class="container bg-light">
    <nav class="navbar navbar-expand-lg navbar-light">
      <a class="navbar-brand" href="${process.env.CLIENT_APP_URL}/">EverChange</a>
      <button class="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarNav"
        aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
        <span class="navbar-toggler-icon"></span>
      </button>
      <div class="collapse navbar-collapse" id="navbarNav">
        <ul class="navbar-nav ml-auto">
          <li class="nav-item active">
            <a class="nav-link" href="${process.env.CLIENT_APP_URL}/">Login <span class="sr-only">(current)</span></a>
          </li>
          <li class="nav-item">
            <a class="nav-link" href="${process.env.CLIENT_APP_URL}/registration">Sign Up</a>
          </li>
        </ul>
      </div>
    </nav>
  </div>
  <div class="container bg-light">
    <div className="row ">
      <p class="font-weight-bold" style="padding: 10px">
        Password changed successfully.
      </p>
      <p class="message" style="padding-left: 10px">
        Please click
        <a href="${process.env.CLIENT_APP_URL}">here</a>
        to continue to login.
      </p>
    </div>
  </div>
</body>

</html>`);
  } catch {
    res.status(500).send(`<html>

<head>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <script src="https://code.jquery.com/jquery-3.2.1.slim.min.js"
    integrity="sha384-KJ3o2DKtIkvYIK3UENzmM7KCkRr/rE9/Qpg6aAZGJwFDMVNA/GpGFF93hXpG5KkN"
    crossorigin="anonymous"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/popper.js/1.12.9/umd/popper.min.js"
    integrity="sha384-ApNbgh9B+Y1QKtv3Rn7W3mgPxhU9K/ScQsAP7hUibX39j7fakFPskvXusvfa0b4Q"
    crossorigin="anonymous"></script>
  <script src="https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0/js/bootstrap.min.js"
    integrity="sha384-JZR6Spejh4U02d8jOt6vLEHfe/JQGiRRSQQxSfFWpi1MquVdAyjUar5+76PVCmYl"
    crossorigin="anonymous"></script>
  <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0/css/bootstrap.min.css"
    integrity="sha384-Gn5384xqQ1aoWXA+058RXPxPg6fy4IWvTNh0E263XmFcJlSAwiGgFAW/dAiS6JXm" crossorigin="anonymous" />

  <style>
    html,
    body {
      height: 100%;
    }

    nav {
      margin-bottom: 20px;
      min-height: 80px;
    }

    .nav-link,
    .navbar-brand {
      color: #007bff !important;
    }

    .message {
      padding-bottom: 50px;
    }
  </style>
</head>

<body>
  <div class="container bg-light">
    <nav class="navbar navbar-expand-lg navbar-light">
      <a class="navbar-brand" href="${process.env.CLIENT_APP_URL}/">EverChange</a>
      <button class="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarNav"
        aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
        <span class="navbar-toggler-icon"></span>
      </button>
      <div class="collapse navbar-collapse" id="navbarNav">
        <ul class="navbar-nav ml-auto">
          <li class="nav-item active">
            <a class="nav-link" href="${process.env.CLIENT_APP_URL}/">Login <span class="sr-only">(current)</span></a>
          </li>
          <li class="nav-item">
            <a class="nav-link" href="${process.env.CLIENT_APP_URL}/registration">Sign Up</a>
          </li>
        </ul>
      </div>
    </nav>
  </div>
  <div class="container bg-light">
    <div className="row ">
      <p class="font-weight-bold" style="padding: 10px">
        There has been an error.
      </p>
      <p class="message" style="padding-left: 10px">
        Please retry again
        <a href="${process.env.CLIENT_APP_URL}/forgot-password">here</a>.
      </p>
    </div>
  </div>
</body>

</html>
`);
  }
});

module.exports = router;
