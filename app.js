//jshint esversion:6
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require('mongoose');
const passport=require('passport');
const flash =require('express-flash');
const session=require('express-session');
const app = express();
const User=require('./models/user');
const cookieSession=require('cookie-session');
var async = require('async');
var crypto = require('crypto');
const nodemailer = require('nodemailer');
require('./config/passport')(passport);

const cookieParser = require('cookie-parser');
const MongoStore = require('connect-mongo')(session)

//cookies to set in a browser
      app.use(cookieParser());

      app.use(session({
        secret: 'cats',
        resave: false,
        saveUninitialized: false,
        store: new MongoStore({ mongooseConnection: mongoose.connection })
      }))



app.use(passport.initialize())
app.use(passport.session())
app.use(flash());



var passportLocalMongoose=require("passport-local-mongoose");

mongoose.connect('mongodb://localhost:27017/fyp_database');
var db=mongoose.connection;
db.on('error', console.log.bind(console, "connection error"));
db.once('open', function(callback){
    console.log("connection succeeded");
})



const bcrypt =require('bcrypt');




app.use(bodyParser.urlencoded({extended: true}));

app.use(express.static(__dirname));

// Main Page Path
app.get("/",function(req,res){
  res.sendFile(__dirname + "/index.html");
});

// login Path
app.get("/login",function(req,res){
  res.sendFile(__dirname + "/login.html");
});

// register Path
app.get("/register",function(req,res){
  res.sendFile(__dirname + "/register.html");
});

// Reset Path
app.get("/reset",function(req,res){
  res.sendFile(__dirname + "/reset.html");
});

// Route to Checkout Page
app.get("/cheakout",function(req,res){
  res.sendFile(__dirname + "/checkout.html");
});

// Forgot Path
app.get("/forgot",function(req,res){
  res.sendFile(__dirname + "/forgot.html");
});

// Product Page Path
app.get("/productpage",function(req,res){
  res.sendFile(__dirname + "/product-page.html");
});


//Registration post request

app.post('/registration',function(req,res){

var passowrd=req.body.password;
var name=req.body.name
bcrypt.hash(req.body.email,10,(err,hash) =>{

  if(err){
      return res.status(500).json({
      error:err

 });
}else{

  const user= new User({
    _id:new mongoose.Types.ObjectId(),
    name:name,
   email:req.body.email,
   password:hash
 });
 user.save(function(err){

  console.log("Data Inserted Successfully");

  if(err){
    conole.log("Error");
  }
  return res.redirect('/register');

 })
}
});
});


//login post request
app.post('/login', passport.authenticate('local', {
  // successRedirect: '/',
  failureRedirect: '/login',
  failureFlash: true
}), (req, res) => {
  if (req.body.remember_me) {
    req.session.cookie.originalMaxAge = 24 * 60 * 60 * 1000 // Expires in 1 day
  } else {
    req.session.cookie.expires = false
  }
  res.redirect('/productpage')
})



//post request user_registration

app.post('/user_registration',function(req, res){
  const { name, email, password} = req.body;
  let errors = [];

  if (password.length < 4) {
    errors.push({ msg: 'Password must be at least 6 characters' });
  }

  if (errors.length > 0) {
    res.render('register', {
      errors,
      password,
    });
  } else {
    User.findOne({ email: email }).then(user => {
      if (user) {
        errors.push({ msg: 'Email already exists' });
        res.redirect('register')
      } else {
        const newUser = new User({
          name,
          email,
          password
        });

        bcrypt.genSalt(10, (err, salt) => {
          bcrypt.hash(newUser.password, salt, (err, hash) => {
            if (err) throw err;
            newUser.password = hash;
            newUser
              .save()
              .then(user => {
                req.flash(
                  'success_msg',
                  'You are now registered and can log in'
                );
                res.redirect('/login');
              })
              .catch(err => console.log(err));
          });
        });
      }
    });
  }
});



app.post('/forgot', function(req, res, next) {
  async.waterfall([
    function(done) {
      crypto.randomBytes(20, function(err, buf) {
        var token = buf.toString('hex');
        done(err, token);
      });
    },
    function(token, done) {
      User.findOne({ email: req.body.email }, function(err, user) {
        if (!user) {
          req.flash('error', 'No account with that email address exists.');
          return res.redirect('/forgot');
        }
    user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

        user.save(function(err) {
          done(err, token, user);
        });
      });
    },
    function(token, user, done) {
      var transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: '',   //Your Email Addrss
          pass: ''    //user account password
        }
      });
      var mailOptions = {
        to: user.email,
        from: '',                   //Your Email Address
        subject: 'Node.js Password Reset',
        text: 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
          'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
          'http://' + req.headers.host + '/reset/' + token + '\n\n' +
          'If you did not request this, please ignore this email and your password will remain unchanged.\n'
      };
      transporter.sendMail(mailOptions, function(err) {
        console.log('mail sent');
        req.flash('success', 'An e-mail has been sent to ' + user.email + ' with further instructions.');
        done(err, 'done');
      });
    }
  ], function(err) {
    if (err) return next(err);
    res.redirect('/forgot');
  });
});


app.get('/reset/:token', function(req, res) {
  User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
    if (!user) {
      req.flash('error', 'Password reset token is invalid or has expired.');
      return res.redirect('/forgot');
    }
      res.sendFile(__dirname + "/reset.html");
  });
});



app.post('/reset/:token', function(req, res) {
  async.waterfall([
    function(done) {
      User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
        if (!user) {
          req.flash('error', 'Password reset token is invalid or has expired.');

          res.sendFile(__dirname + "/register.html");
        }
        bcrypt.hash(req.body.password,10,(err,hash) =>{

          if(err){
            return res.status(500).json({
           error:err
         });
        }else{
        user.password =hash;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;

        user.save(function(err) {
          req.logIn(user, function(err) {
            done(err, user);
          });
        });
      }
    });
      });
    },
    function(user, done) {
      var transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: '',     //Your Password
          pass: ''     //Your Password
        }
      });
      var mailOptions = {
        to: user.email,
        from: "",   //Your Email Addrss
        subject: 'Your password has been changed',
        text: 'Hello,\n\n' +
          'This is a confirmation that the password for your account ' + user.email + ' has just been changed.\n'
      };
      transporter.sendMail(mailOptions, function(err) {
        req.flash('success', 'Success! Your password has been changed.');
        done(err);
      });
    }
  ], function(err) {
    res.sendFile(__dirname + "/login.html");

  });
});

// initializing Server
app.listen(3000,function(){
  console.log("Server is running on prot 3000");
});
