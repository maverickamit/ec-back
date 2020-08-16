const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Binary } = require("mongodb");

const userSchema = mongoose.Schema({
  firstName: {
    type: String,
    required: true,
    trim: true,
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    unique: true,
    validate(value) {
      if (!validator.isEmail(value)) {
        throw new Error("Email is invalid");
      }
    },
  },
  password: {
    type: String,
    required: true,
    trim: true,
    minlength: 8,
  },
  emailVerified: {
    type: Boolean,
    required: true,
    default: false,
  },
  bankLinked: {
    type: Boolean,
    required: true,
    default: false,
  },
  stripeCustomerId: {
    type: String,
    required: false,
  },
  tokens: [
    {
      token: {
        type: String,
        required: true,
      },
    },
  ],
  avatar: {
    type: Buffer,
  },
});

//logging in middleware
userSchema.statics.findByCredentials = async (email, password) => {
  const user = await User.findOne({
    email,
  });
  if (!user) {
    throw new Error("Unable to login");
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    throw new Error("Unable to login");
  }

  return user;
};
//middleware for generating authentication token
userSchema.methods.generateAuthToken = async function () {
  const user = this;
  const token = jwt.sign(
    {
      _id: user._id.toString(),
    },
    "everchangetokenverification",
    {
      expiresIn: "24h",
    }
  );

  user.tokens = user.tokens.concat({
    token,
  });
  await user.save();
  return token;
};

//Limiting sending private info to client

userSchema.methods.toJSON = function () {
  const user = this;
  const userObject = user.toObject();

  delete userObject.password;
  delete userObject.tokens;
  delete userObject.avatar;

  return userObject;
};

//hashing password
userSchema.pre("save", async function (next) {
  const user = this;
  if (user.isModified("password")) {
    user.password = await bcrypt.hash(user.password, 8);
  }
  next();
});
const User = mongoose.model("User", userSchema);

// const newUser = new User({
//   firstName: "Amit",
//   lastName: "L",
//   email: "mike@aol.com",
//   password: "password123",
// });

// newUser
//   .save()
//   .then((result) => {
//     console.log(newUser);
//   })
//   .catch((err) => {
//     console.log(err);
//   });

module.exports = User;
