const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

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
  billingAddress: {
    type: String,
    required: false,
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
  plaidToken: {
    type: String,
    required: false,
  },
  linkUpdateToken: {
    type: String,
    required: false,
    default: "",
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
  amountsCharged: [
    {
      amount: {
        type: Number,
        required: true,
      },
      dateCharged: {
        type: Date,
        required: true,
      },
    },
  ],
  leftOverAmount: {
    type: Number,
    required: true,
    default: 0,
  },
  subscriptionDetails: {
    startDate: {
      type: Date,
      required: false,
    },
    renewDate: {
      type: Date,
      required: false,
    },
    daysPassed: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  currentCharity: {
    id: {
      type: Number,
      required: true,
      default: 100,
    },
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
    process.env.JWT_AUTH_SECRET,
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
  delete userObject.plaidToken;
  delete userObject.stripeCustomerId;

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

module.exports = User;
