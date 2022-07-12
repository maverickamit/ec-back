const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const adminSchema = mongoose.Schema({
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
  tokens: [
    {
      token: {
        type: String,
        required: true,
      },
    },
  ],
});

//logging in middleware
adminSchema.statics.findByCredentials = async (email, password) => {
  const admin = await Admin.findOne({
    email,
  });
  if (!admin) {
    console.log("email wrong");
    throw new Error("Unable to login");
  }

  const isMatch = await bcrypt.compare(password, admin.password);

  if (!isMatch) {
    console.log("pw wrong");
    throw new Error("Unable to login");
  }

  return admin;
};

//middleware for generating authentication token
adminSchema.methods.generateAuthToken = async function () {
  const admin = this;
  const token = jwt.sign(
    {
      _id: admin._id.toString(),
    },
    process.env.JWT_AUTH_SECRET,
    {
      expiresIn: "24h",
    }
  );

  admin.tokens = admin.tokens.concat({
    token,
  });
  await admin.save();
  return token;
};

//Limiting sending private info to client

adminSchema.methods.toJSON = function () {
  const admin = this;
  const adminObject = admin.toObject();

  delete adminObject.password;
  delete adminObject.tokens;

  return adminObject;
};

//hashing password
adminSchema.pre("save", async function (next) {
  const admin = this;
  if (admin.isModified("password")) {
    admin.password = await bcrypt.hash(admin.password, 8);
  }
  next();
});
const Admin = mongoose.model("Admin", adminSchema);

module.exports = Admin;
