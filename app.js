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
const aboutContent = "Hac habitasse platea dictumst vestibulum rhoncus est pellentesque. Dictumst vestibulum rhoncus est pellentesque elit ullamcorper. Non diam phasellus vestibulum lorem sed. Platea dictumst quisque sagittis purus sit. Egestas sed sed risus pretium quam vulputate dignissim suspendisse. Mauris in aliquam sem fringilla. Semper risus in hendrerit gravida rutrum quisque non tellus orci. Amet massa vitae tortor condimentum lacinia quis vel eros. Enim ut tellus elementum sagittis vitae. Mauris ultrices eros in cursus turpis massa tincidunt dui.";
const contactContent = "Scelerisque eleifend donec pretium vulputate sapien. Rhoncus urna neque viverra justo nec ultrices. Arcu dui vivamus arcu felis bibendum. Consectetur adipiscing elit duis tristique. Risus viverra adipiscing at in tellus integer feugiat. Sapien nec sagittis aliquam malesuada bibendum arcu vitae. Consequat interdum varius sit amet mattis. Iaculis nunc sed augue lacus. Interdum posuere lorem ipsum dolor sit amet consectetur adipiscing elit. Pulvinar elementum integer enim neque. Ultrices gravida dictum fusce ut placerat orci nulla. Mauris in aliquam sem fringilla ut morbi tincidunt. Tortor posuere ac ut consequat semper viverra nam libero.";

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

app.use(session({
  secret: 'Our little secret.',
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/booksDB", {useNewUrlParser: true, useUnifiedTopology: true});
mongoose.set("useCreateIndex", true);


const bookSchema = new mongoose.Schema ({
  title: String,
  author: String,
  review: String
});

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  books: bookSchema,
});

userSchema.plugin(passportLocalMongoose);

const Book = new mongoose.model("Book", bookSchema);
const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

//Home url
app.get("/", function(req,res){
  res.render("home")
});

// Register user urls
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

app.get("/dashboard", function(req, res){
  Book.find({}, function(err, foundBooks){
    res.render("dashboard", {
      startingContent: homeStartingContent,
      books: foundBooks
    });
  });
});

app.route("/create")

.get(function(req, res){
  if (req.isAuthenticated()){
    console.log(req.user);
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

  book.save(function(err){
    const userId = req.user._id
    User.findByIdAndUpdate(userId, {books: book}, function(err, book){
      if (err){
        console.log(err);
      } else {
        console.log("Success in adding book to user");
      }
    })
    res.redirect("/dashboard")
  })
});

app.get("/books/:book_id", function(req, res){

  const bookId = req.params.book_id;

  Book.findOne({_id: bookId}, function(err, foundBook){
    if (!err){
      res.render("book", {bookId:bookId, bookTitle: foundBook.title, bookAuthor: foundBook.author, bookReview: foundBook.review})
    } else {
      console.log(err);
    }
  });
});

app.route("/update/:book_id")

.get(function(req, res){

  const bookId = req.params.book_id;

  Book.findOne({_id: bookId}, function(err, foundBook){
    if (!err){
      res.render("update", {bookId:bookId, bookTitle: foundBook.title, bookAuthor: foundBook.author, bookReview: foundBook.review})
    }
  })
})

.post(function(req, res){

  const bookId = req.params.book_id;

  Book.updateOne({_id: bookId}, {title:req.body.bookTitle, author: req.body.authorName, review: req.body.reviewBody}, function(err, updatedBook){
    if (!err){
      res.redirect("/")
    } else {
      console.log(err);
    }
  })
});

app.route("/delete/:book_id")

.get(function(req, res){
  const bookId = req.params.book_id;

  Book.findOne({_id: bookId}, function(err, foundBook){
    if (!err){
      res.render("delete", {bookId:bookId, bookTitle: foundBook.title, bookAuthor: foundBook.author, bookReview: foundBook.review})
    }
  })
})

.post(function(req, res){

  const bookId = req.params.book_id;

  Book.deleteOne({_id: bookId}, function(err){
    if (!err){
      res.redirect("/")
    } else {
      console.log(err);
    }
  })
});




app.listen(3000, function(){
  console.log("Server started succesfully on 3000");
})
