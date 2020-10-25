//All routes related to User. ex: signup, login, avatar picture etc
const express = require("express");
const router = new express.Router();
const User = require("../models/user");
const auth = require("../middleware/auth");
const jwt = require("jsonwebtoken");
const { sendWelcomeEmail } = require("../emails/account");
const { sendPasswordResetEmail } = require("../emails/passwordResetEmail");

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


//Endpoint for handling forgot password
router.post("/forgotPassword", async (req, res) => {
  try {
    const email = req.body.email
    const user = await User.findOne({
      email: email,
    });
    const resetToken = jwt.sign(
      {
        _id:user._id,
        email: user.email,
      },
      user.password+"-forgotpasswordec",
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
    if (!user){
      throw new Error()
    }
    const secret = user.password+"-forgotpasswordec"
    const resetToken = jwt.decode(
      req.params.token, secret
    );
    res.send(
      `<link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.0/css/bootstrap.min.css" integrity="sha384-9aIt2nRpC12Uk9gS9baDl411NQApFmC26EwAOH8WgZl5MYYxFfc+NcPb1dKGj7Sk" crossorigin="anonymous">

      <style>html,body { height: 100%; }
      
        body{
          display: -ms-flexbox;
          display: -webkit-box;
          display: flex;
          -ms-flex-align: center;
          -ms-flex-pack: center;
          -webkit-box-align: center;
          align-items: center;
          -webkit-box-pack: center;
          justify-content: center;
          background-color: #f5f5f5;
        }
        
        form{
          padding-top: 10px;
          font-size: 14px;
          margin-top: 30px;
        }
        
        .card-title{ font-weight:300; }
        
        .btn{
          font-size: 14px;
          margin-top:20px;
        }
        
        .login-form{ 
          width:320px;
          margin:20px;
        }
        
        .sign-up{
          text-align:center;
          padding:20px 0 0;
        }
        
        span{
          font-size:14px;
        }</style>
      
        <div class="card login-form">
        <div class="card-body">
          <h3 class="card-title text-center">Reset password</h3>
          
          <div class="card-text">
            <form action="/users/forgotPassword/reset" method="POST"
            oninput='pw2.setCustomValidity(pw2.value != pw.value ? "Passwords do not match." : "");
            pw.setCustomValidity(pw.value.length <8 ? "Please increase length of your password" : "")'>
              <div class="form-group">
                <label for="exampleInputEmail1">Enter new password</label>
                <input type="password" class="form-control form-control-sm" required name="pw" placeholder="Greater than or equal to 8 characters">
              </div>
              <div class="form-group">
                <label for="exampleInputEmail1">Retype new password</label>
                <input type="password" class="form-control form-control-sm" placeholder="" name="pw2">
              </div>
              <button type="submit" class="btn btn-primary btn-block">Reset</button>
            </form>
          </div>
        </div>
      </div>`
);
  } catch(e) {
    res.status(500)
    .send(`<link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.0/css/bootstrap.min.css" integrity="sha384-9aIt2nRpC12Uk9gS9baDl411NQApFmC26EwAOH8WgZl5MYYxFfc+NcPb1dKGj7Sk" crossorigin="anonymous">
      <div className="container">
        <div className="row">
          <p class="font-weight-bold " style="padding:20px;font-size:calc(100% + 1vh)" >Error in verification.</p>
        </div>
      </div>`);
  }
});

//Route to handle reset password submit form
router.post("/forgotPassword/reset", async (req, res) => {
  try {
    console.log(req.body)
    res.send();
  } catch {
    res.status(500).send();
  }
});

module.exports = router;
