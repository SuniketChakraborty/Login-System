//jshint esversion:6
require('dotenv').config()
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const GoogleStrategy = require('passport-google-oauth2').Strategy;
const findOrCreate = require("mongoose-findorcreate");


//const encrypt = require("mongoose-encryption");
// const md5 = require('md5');
//const bcrypt = require('bcrypt');
//const saltRounds = 10;


const app = express();

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded(
    { extended: true }
));

app.use(session({
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: false,
  
}))
app.use(passport.initialize());
app.use(passport.session());


// Connecting to momgodb database userDB
mongoose.connect("mongodb://localhost:27017/userDB");

// Creating the schema of the database
const userSchema = new mongoose.Schema ({
    email: String,
    password: String,
    googleId: String

});

// Encrypting the password field of the user schema
userSchema.plugin(passportLocalMongoose);

userSchema.plugin(findOrCreate);

// Creating the User model using userSchema and setting User as the collection name
const User = new mongoose.model('User', userSchema);


// use static authenticate method of model in LocalStrategy
passport.use(User.createStrategy());

// used to serialize the user for the session
passport.serializeUser(function(user, done) {
    done(null, user.id); 
   // where is this user.id going? Are we supposed to access this anywhere?
});

// used to deserialize the user
passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
        done(err, user);
    });
});

passport.use(new GoogleStrategy({
    clientID:     process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/dashboard",
    userProfileURL: "http://www.googlrapis.com/ouath2/v3/user info",
    passReqToCallback   : true
  },
    function (request, accessToken, refreshToken, profile, done) {
        console.log(profile)
        console.log(profile.displayName);
    User.findOrCreate({username: profile.displayName, googleId: profile.id }, function (err, user) {
      return done(err, user);
    });
  }
));


app.get("/", function (req, res) {
    res.render("home");
})

app.get("/auth/google", 
    passport.authenticate("google", { scope: ["profile"] })
)

app.get('/auth/google/dashboard',
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/dashboard');
  });

app.get("/login", function (req, res) {
    res.render("login");
})

app.get("/register", function (req, res) {
    res.render("register");
})


app.get("/dashboard", function (req, res) {
    if (req.isAuthenticated()) {
        res.render("dashboard");
        }
    else {
        res.redirect("/login")
    }
})

app.get("/logout", function (req, res) {
    req.logout();
    res.redirect('/');
})

app.post("/register", function (req, res) {

//     bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
//     // Store hash in your password DB.
//     const newUser = new User({      // Creating newUser document using the User model
//         email: req.body.username,
//         //password: md5(req.body.password) Hashing the password we get from the body of the request
//         password: hash

//     });
//     newUser.save(function (err) {
//         if (err) {
//             console.log(err);
//         }
//         else {
//             res.render("secrets");
//         }
//     })
// });
    
    User.register({ username: req.body.username }, req.body.password, function (err, user) {
        if (err) {
            console.log(err);
            res.redirect("/register");
        }
        
        else {
            passport.authenticate("local")(req, res, function () {
            res.redirect("/dashboard")
            })
        } 
        
    })
    
})

app.post("/login", function (req, res) {
    // const username = req.body.username;
    // const password = req.body.password;  // Hashing the password we used to login

    // User.findOne({ email: username }, function (err, foundUser) {  // Using the findOne function on the User model
    //     console.log(foundUser);
    //     if (err) {
    //         console.log(err);
    //     }
    //     else {
    //         if (foundUser) {
    //             bcrypt.compare(password, foundUser.password, function(err, result) {
    //                 if (result == true) {
    //                    res.render("secrets");
    //               }
    //          });
                    
    //             }
    //         }
    //     })
    const user = new User({
        username: req.body.username,
        password: req.body.password
    });

    req.login(user, function (err) {
        if (err) {
            console.log(err);
        } else {
            passport.authenticate("local")(req, res, function () {
            res.redirect("/dashboard")
                
            })
        }
        })


    })








// Listening to server on port 3000
app.listen(3000, function () {
    console.log("Server Started on port 3000");
})
