const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const session = require('express-session');
const MongoStore = require('connect-mongo')(session);

const app = express();

const uri = "mongodb+srv://abhijit:dbUserPw@users-9wwz5.mongodb.net/test?retryWrites=true&w=majority";
const mongOptions = { useNewUrlParser: true, useUnifiedTopology: true };
mongoose.connect(uri, mongOptions);

app.use(session({
    resave: false,
    saveUninitialized: false,
    secret: '1234',
    store: new MongoStore({ url: uri }),
    ttl: 24 * 60 * 60 * 1000
}));

const userSchema = new mongoose.Schema({
    firstName: String,
    lastName: String,
    password: String,
    email: String,
});

const User = mongoose.model("user", userSchema);

// app.use("/views", express.static("./views"));
app.set("view engine", "ejs");
app.use(express.urlencoded({extended: false}));
app.use("/public", express.static("./public"));


let msg = "";
let dummyUser = {firstName: "dummmy", lastName: "dummy", email: "dummy@dummy.com"};
//Session Checking middleware
const redirectToHome = (req, res, next) => {
    if (req.session.userId) {
        res.redirect('/login-success');
    } else {
        next();
    }
}
const redirectToLogin = (req, res, next) => {
    if (!req.session.userId) {
        res.redirect('/login');
    } else {
        next();
    }
}
//GETting pages
app.get("/signup", redirectToHome, (req, res) => {
    res.render("signup", {
        msg
    });
});
app.get("/login", redirectToHome, (req, res) => {
    res.render("login", {
        msg
    });
});
app.get("/login-success", redirectToLogin, (req, res) => {
    res.render("login-success", {
        user: dummyUser
    });
});

//The SignUp system
app.post("/signup", async (req, res) => {

    try {
        //Check if the email id already exists in the database.
        const emailIdExists = await User.exists({
            email: req.body.email
        });
        if (emailIdExists) {
            msg = "Sorry, this E-mail ID already exists.";
            res.render("signup", {msg});
        } else {
            const hashedPassword = await bcrypt.hash(req.body.password, 10);
            const user = await User({
                firstName: req.body.firstName,
                lastName: req.body.lastName,
                email: req.body.email,
                password: hashedPassword,
            }).save();
            req.session.userId = user._id;
            // dummyUser = Object.assign({}, user);
            res.render("login-success", {user});
        }
    } catch {
        msg = "Oops! An error occured. Please try again!";
        res.render("signup", { msg });
    }
});

//The Log In system
app.post("/login", redirectToHome, async (req, res) => {
    try {
        const user = await User.findOne({ email: req.body.email });
        if (!user) {
            const err = "Email ID doesn't exist. Please sign up!";
            res.render("login", { msg: err });
        } else {
            const passwordCorrect = await bcrypt.compare(req.body.password, user.password);
            if (passwordCorrect) {
                // TODO: check this
                req.session.userId = user._id;
                res.render("login-success", {user});
            } else {
                const err = "Wrong Password. Please try again.";
                res.render("login", { msg: err });
            }
        }
    } catch {
        res.status(500).send();
        res.render("login", {msg});
    }
});

//Log Out
app.post('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

app.listen(3000);