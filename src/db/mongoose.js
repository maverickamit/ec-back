const mongoose = require("mongoose");
const validator = require("validator");

mongoose.connect(
  "mongodb+srv://Amit:ec123@cluster0-aetxj.mongodb.net/everchange-api?retryWrites=true&w=majority",
  {
    useNewUrlParser: true,
    useCreateIndex: true,
  }
);

const User = mongoose.model("User", {
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  email: {
    type: String,
    required: true,
    lowercase: true,
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
});

const newUser = new User({
  firstName: "Amit",
  lastName: "L",
  email: "mike@aol.com",
  password: "password123",
});

newUser
  .save()
  .then((result) => {
    console.log(newUser);
  })
  .catch((err) => {
    console.log(err);
  });
