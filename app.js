const express = require('express');
const ejs = require('ejs');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const _ = require("lodash");
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');


const app = express();

const homeStartingContent = "Lacus vel facilisis volutpat est velit egestas dui id ornare. Semper auctor neque vitae tempus quam. Sit amet cursus sit amet dictum sit amet justo. Viverra tellus in hac habitasse. Imperdiet proin fermentum leo vel orci porta. Donec ultrices tincidunt arcu non sodales neque sodales ut. Mattis molestie a iaculis at erat pellentesque adipiscing. Magnis dis parturient montes nascetur ridiculus mus mauris vitae ultricies. Adipiscing elit ut aliquam purus sit amet luctus venenatis lectus. Ultrices vitae auctor eu augue ut lectus arcu bibendum at. Odio euismod lacinia at quis risus sed vulputate odio ut. Cursus mattis molestie a iaculis at erat pellentesque adipiscing.";
const contactContent = "Scelerisque eleifend donec pretium vulputate sapien. Rhoncus urna neque viverra justo nec ultrices. Arcu dui vivamus arcu felis bibendum. Consectetur adipiscing elit duis tristique. Risus viverra adipiscing at in tellus integer feugiat. Sapien nec sagittis aliquam malesuada bibendum arcu vitae. Consequat interdum varius sit amet mattis. Iaculis nunc sed augue lacus. Interdum posuere lorem ipsum dolor sit amet consectetur adipiscing elit. Pulvinar elementum integer enim neque. Ultrices gravida dictum fusce ut placerat orci nulla. Mauris in aliquam sem fringilla ut morbi tincidunt. Tortor posuere ac ut consequat semper viverra nam libero.";

app.set('view engine', 'ejs');

//parser and static declaration
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

//session info using passport.js
app.use(session({
  secret: 'Our little secret.',
  resave: false,
  saveUninitialized: false
}));

//initialize session using passport
app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/booksDB", {useNewUrlParser: true, useUnifiedTopology: true});
mongoose.set("useCreateIndex", true);

//schema declaration
const bookSchema = new mongoose.Schema ({
  title: String,
  author: String,
  review: String
});

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  books: [bookSchema]
});

userSchema.plugin(passportLocalMongoose);

//create collections
const Book = new mongoose.model("Book", bookSchema);
const User = new mongoose.model("User", userSchema);

//create strategy for local authentication
passport.use(User.createStrategy());

//serialize and deserialize user for auto login
passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

//check for currentUser to send to templates for rendering the correct name in dashboard.
const currentUser = (req, res, next) => {
    // req.user or req.isAuthenticated()
  if (!req.user) {
    res.locals.user = null;
    return next();
  }
  // res.locals."user" -> user object is available in the views
  res.locals.user = req.user;
  next();
};

//currentUser to be run on all get requests.
app.get("*", currentUser);


//Home url
app.get("/", function(req,res){
  res.render("home")
});

// Register user get and post
app.route("/register")

.get(function(req, res){
  res.render("register")
})

.post(function(req, res){

  User.register({username: req.body.username}, req.body.password, function(err, user){
    if (err){
      console.log(err);
      res.redirect("/register")
    } else {
      passport.authenticate("local")(req, res, function(){
        res.redirect("/create")
      });
    }
  });
});

//login routes
app.route("/login")

.get(function(req, res){
  res.render("login");
})

.post(function(req, res){

  const user = new User({
    username: req.body.username,
    password: req.body.password
  })

  req.login(user, function(err){
    if (err){
      console.log(err);
    } else{
      passport.authenticate("local")(req, res, function(){
        res.redirect("/dashboard")
      })
    }
  });
});

//logout routes

app.get("/logout", function(req, res){
  req.logout();
  res.redirect("/")
})

//dashboad get req get all the books and render it
app.get("/dashboard",function(req, res){
  if (req.isAuthenticated()){
    console.log(req.user.username);
    res.render("dashboard", {name: req.user.username, startingContent: homeStartingContent, books: req.user.books})
  } else{
    res.redirect("/login")
  }
});

//create books route
app.route("/create")

.get(function(req, res){
  if (req.isAuthenticated()){
    res.render("create")
  } else {
    res.redirect("/register")
  }
})


.post(function(req, res){

  const bookTitle = req.body.bookTitle;
  const authorName = req.body.authorName;
  const reviewBody = req.body.reviewBody;

  const book = new Book({
    title: bookTitle,
    author: authorName,
    review: reviewBody
  });

  const userId = req.user._id;

  User.findById(userId).then(user => {
    user.books.push(book)
    return user.save();
  }).then(() => {
    console.log("saved")
    res.redirect("/dashboard");
  }).catch(error => console.log(error))

});

//books view page
app.get("/books/:book_id", function(req, res){

  const bookId = req.params.book_id;

  if (req.isAuthenticated()){
    req.user.books.forEach(function(book){
      if (bookId == book._id){
        res.render("book", {bookTitle: book.title, bookAuthor: book.author, bookReview: book.review, bookId: bookId});
      }
    })
  } else {
    res.redirect("/login")
  }
});

//update books route, update title, author and review
app.route("/update/:book_id")

.get(function(req, res){

  const bookId = req.params.book_id;

  if (req.isAuthenticated()){
    req.user.books.forEach(function(book){
      if (bookId == book._id){
        res.render("update", {bookTitle: book.title, bookAuthor: book.author, bookReview: book.review, bookId: bookId})
      }
    })
  } else {
    res.redirect("/login")
  }
})

.post(function(req, res){
  console.log(req.body);
  const bookId = req.params.book_id;
  User.updateOne({_id: req.user._id, "books._id": bookId}, {$set: req.body}, function(err){
    if (!err){
      res.redirect("/dashboard")
      console.log("Successfuly Updated Values");
    } else {
      console.log(err);
    }
  })
});


//delte a book you dont want anymore
app.route("/delete/:book_id")

.get(function(req, res){

  const bookId = req.params.book_id;

  if (req.isAuthenticated()){
    req.user.books.forEach(function(book){
      if (bookId == book._id){
        res.render("delete", {bookId:bookId, bookTitle: book.title})
      }
    })
  } else {
    res.redirect("/login")
  }
})

.post(function(req, res){

  const bookId = req.params.book_id;

  User.update({}, {$pull: {books: {_id: bookId}}}, {multi: true}, function(err){
    if (!err){
      res.redirect("/dashboard")
    } else {
      console.log(err);
    }
  })
});

app.get("/about", function(req, res){
  res.render("about");
});

app.get("/contact", function(req, res){
  res.render("contact", {contactContent: contactContent});
});

app.listen(3000, function(){
  console.log("Server started succesfully on 3000");
})
