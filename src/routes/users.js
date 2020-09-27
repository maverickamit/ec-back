//All routes related to User. ex: signup, login, avatar picture etc
const express = require("express");
const router = new express.Router();
const User = require("../models/user");
const auth = require("../middleware/auth");
const jwt = require("jsonwebtoken");
const { sendWelcomeEmail } = require("../emails/account");
const multer = require("multer");
const sharp = require("sharp");
const bcrypt = require("bcryptjs");

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
      "verificationemailec",
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
      throw new Error();
    }
    res.set("Content-Type", "image/png");
    res.send(user.avatar);
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
      "verificationemailec",
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
//Getting a list of all U  sers

// router.get("/", (req, res) => {
//   User.find({})
//     .then((users) => {
//       res.send(users);
//     })
//     .catch((e) => {
//       res.status(500).send();
//     });
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

//Endpoint for loggin out user from all sessions

router.post("/logoutAll", auth, async (req, res) => {
  try {
    req.user.tokens = [];
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

  //checking if provided old password is correct before updating

  try {
    const user = req.user;
    const isPassWordValid = await bcrypt.compare(
      body.oldPassword,
      user.password
    );
    if (!isPassWordValid) {
      res.status(400).send({
        error: "Invalid Password!",
      });
    }
  } catch (e) {
    res.status(500).send(e);
  }

  if (!isValidOperation) {
    res.status(400).send({
      error: "Invalid updates!",
    });
  }
  try {
    const user = req.user;
    updatesUsed.forEach((update) => {
      if (body[update] !== "") {
        console.log(body[update]);
        user[update] = body[update];
      }
    });
    await user.save();

    if (!user) {
      res.status(404).send();
    }
    res.send(user);
  } catch (e) {
    res.status(500).send(e);
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

//Verifying Email

router.get("/authenticate/:token", async (req, res) => {
  try {
    const mytoken = req.params.token;
    const userEmail = jwt.verify(mytoken, "verificationemailec");
    const user = await User.findOne({
      email: userEmail.email,
    });
    if (user) {
      user.emailVerified = true;
      await user.save();

      res.send(
        `<link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.0/css/bootstrap.min.css" integrity="sha384-9aIt2nRpC12Uk9gS9baDl411NQApFmC26EwAOH8WgZl5MYYxFfc+NcPb1dKGj7Sk" crossorigin="anonymous">
        <div className="container">
          <div className="row">
            <p class="font-weight-bold" style="padding:20px;font-size:calc(100% + 1vh)" >Your Email is Verified</p>
            <p  style="padding-left:20px;font-size:calc(100% + 1vh);">Please Click 
              <a href="https://everchange.herokuapp.com">Here</a> 
            to continue to login.</p>
          </div>
        </div>`
      );
    }
  } catch (e) {
    res.status(500)
      .send(`<link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.0/css/bootstrap.min.css" integrity="sha384-9aIt2nRpC12Uk9gS9baDl411NQApFmC26EwAOH8WgZl5MYYxFfc+NcPb1dKGj7Sk" crossorigin="anonymous">
        <div className="container">
          <div className="row">
            <p class="font-weight-bold " style="padding:20px;font-size:calc(100% + 1vh)" >Error in verification.</p>
          </div>
        </div>`);
  }
});

module.exports = router;
