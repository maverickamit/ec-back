// const createError = require("http-errors");
const express = require("express");
// const path = require("path");
// const cookieParser = require("cookie-parser");
// const logger = require("morgan");
const port = process.env.PORT || 3000;
require("./src/db/mongoose");
const User = require("./src/db/models/user");

// const indexRouter = require("./src/routes/index");
// const usersRouter = require("./src/routes/users");

const app = express();

// // view engine setup
// app.set("views", path.join(__dirname, "views"));
// app.set("view engine", "pug");

// app.use(logger("dev"));
app.use(express.json());
// app.use(express.urlencoded({ extended: false }));
// app.use(cookieParser());
// app.use(express.static(path.join(__dirname, "public")));

// app.use("/", indexRouter);
// // app.use("/users", usersRouter);

// // catch 404 and forward to error handler
// app.use(function (req, res, next) {
//   next(createError(404));
// });

// // error handler
// app.use(function (err, req, res, next) {
//   // set locals, only providing error in development
//   res.locals.message = err.message;
//   res.locals.error = req.app.get("env") === "development" ? err : {};

//   // render the error page
//   res.status(err.status || 500);
//   res.render("error");
// });

//Creating REST API endpoints

app.post("/users", (req, res) => {
  console.log(req.body);
  res.send("testing");
});

//Serving the app on port 3000
app.listen(port, () => {
  console.log("server is up on port " + port);
});

// module.exports = app;
