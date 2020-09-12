const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const ejs = require("ejs");
const bcrypt = require("bcryptjs");
const salt = bcrypt.genSaltSync(10);
const passwordValidator = require("password-validator");
const session = require("express-session");
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const passportLocalMongoose = require("passport-local-mongoose");

const multer = require("multer");
const isImage = require('is-image');
var path = require("path");
const sizeOf = require("image-size");
const app = express();
var editProduct;
var result;


const passwordSchema = new passwordValidator();

passwordSchema
.is().min(8)
.has().uppercase()
.has().lowercase()
.has().digits(1)
.has().not().spaces();

var Storage = multer.diskStorage({
  destination : "./public/uploads/",
  filename : (req,file,cb) =>{
    cb(null,file.fieldname + "_" + Date.now() + path.extname(file.originalname));
  }
});

var upload = multer({
  storage : Storage
}).single('file');




app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(express.static("public"));

app.use(session({
  secret : "Our Little Secret",
  resave : true,
  saveUninitialized : false
}));
app.use(passport.initialize());
app.use(passport.session());

app.use(flash());

app.use(function(req,res,next){
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');

  next();
});

mongoose.connect("mongodb://localhost:27017/Shopping-CartDB", {useNewUrlParser: true, useUnifiedTopology: true},function(err){
  if(err){
    console.log(err);
  }
  else{
    console.log("Connected to mongoDB");
  }
});
mongoose.set("useCreateIndex", true);
const userSchema = {
  Fullname : String,
  Username : String,
  Emailaddress : String,
  Mode : String,
  Password :String,
  ConfirmPassword :String
};

const sellerProductsSchema = {
  Username : String,
  Products : [{
    ProductName : String,
    Price : String,
    Category : String,
    Description : String,
    Quantity : String,
    ProductID : String,
    Image : String
  }],
PurchaseDetails : [{
  ProductIDForPurchase : String,
  ProductNameForPurchase : String,
  QuantityPurchased :String,
  CustomerName : String,
  DateOfPurchase : String,
  Price  : String,
  Category : String,
  Description : String,
  Image : String
}]

};

const buyerProductsSchema = {
  Username : String,
  MyCart : [{
    ProductName : String,
    ProductID : String,
    SellerName : String,
    Quantity : String,
    Price : String,
    Category : String,
    Description : String,
    Image : String,
    isAdded : String
  }],
  OrderHistory : [{
    ProductName : String,
    ProductID : String,
    SellerName : String,
    Quantity : String,
    Price : String,
    Category : String,
    Description : String,
    Image : String,
    Date : String
  }]
};

const completeProductsSchema = {
  Username : String,
  Mode : String,
  ProductName : String,
  ProductID : String,
  Price : String,
  Category : String,
  Quantity : Number,
  Description : String,
  Image : String
};



const User = mongoose.model("User", userSchema);
const SellerProducts = mongoose.model("SellerProducts", sellerProductsSchema);
const CompleteProduct = mongoose.model("CompleteProduct", completeProductsSchema);
const BuyerProducts = mongoose.model("BuyerProducts", buyerProductsSchema);
passport.use(
  new LocalStrategy({ Emailaddress : 'email' }, (email,password,done) => {
     User.findOne({Emailaddress : email})
     .then(user => {
       if(!user){
         return done(null,false, {message : "That email is not registered"});
       }
       bcrypt.compare(password,user.Password, function(err,isMatch){
         if(err) throw err;

         if(isMatch){
           return done(null,user);
         }
         else{
           return done(null,false, {message : 'Incorrect Password'});
         }
       })
     })
     .catch(err => console.log(err));
  })
);

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});



app.get("/",function(req,res){
   res.sendFile(__dirname + "/index.html");
});

app.get("/register",function(req,res){
  res.render("register",{errors : [],userNameError : '',emailError : ''});
});

app.get("/login",function(req,res){
  res.render("login");
});

app.get("/Contact",function(req,res){
  if(req.isAuthenticated()){
    if(req.user.Mode == "Buyer"){
      res.render("extra/buyer-contact");
    }
    else{
      res.render("extra/seller-contact");
    }
  }
  else{
    req.flash('success_msg',"You must log in to continue");
    res.redirect("/login");
  }
});

app.get("/About",function(req,res){
  if(req.isAuthenticated()){
    if(req.user.Mode == "Buyer"){
      res.render("extra/buyer-About");
    }
    else{
      res.render("extra/seller-about");
    }
  }
  else{
    req.flash('success_msg',"You must log in to continue");
    res.redirect("/login");
  }
})

app.get("/dashboard",function(req,res){
  if(req.isAuthenticated()){
    if(req.user.Mode == "Seller"){

      SellerProducts.findOne({Username : req.user.Username},function(err,foundPerson){
        if(!err){
          if(foundPerson){
            res.render("seller-dashboard",{fullName : req.user.Fullname,MyProducts : foundPerson.Products});
          }

        }
      });

  }
  else{

    CompleteProduct.find({},function(err,foundProduct){
      if(!err){
        if(foundProduct){
          var cart = [];
          BuyerProducts.findOne({Username : req.user.Username},function(err,foundPerson){
            if(!err){
              if(foundPerson){

                foundPerson.MyCart.forEach(function(product){
                  cart.push(product.ProductID);

                });

                res.render("buyer-dashboard",{fullName : req.user.Fullname, AllProducts : foundProduct,cart : cart});

              }
            }
          });


        }
      }
    });
    }
  }
  else{
    req.flash('success_msg',"You must log in to continue");
    res.redirect("/login");
  }
});

app.get("/dashboard/Fruits-Vegetables",function(req,res){
  if(req.isAuthenticated()){
    if(req.user.Mode == "Buyer"){
      CompleteProduct.find({Category : "Fruits/Vegetables"},function(err,foundProduct){
        if(!err){
          if(foundProduct){
            var cart = [];
            BuyerProducts.findOne({Username : req.user.Username},function(err,foundPerson){
              if(!err){
                if(foundPerson){

                  foundPerson.MyCart.forEach(function(product){
                    cart.push(product.ProductID);

                  });

                  res.render("BuyerProducts/fruitsVegetables",{fullName : req.user.Fullname, AllProducts : foundProduct,cart : cart});

                }
              }
            });
          }
        }
      });

    }
    else{
      SellerProducts.findOne({Username : req.user.Username},function(err,foundPerson){
        if(!err){
          if(foundPerson){
            const result = foundPerson.Products.filter(product => product.Category == "Fruits/Vegetables");
            console.log(result);
            res.render("products/fruitsVegetables",{fullName : req.user.Fullname,MyProducts : result});
          }
        }
      });
    }
  }
  else{
    req.flash('success_msg',"You must log in to continue");
    res.redirect("/login");
  }
});

app.get("/dashboard/Men'sWear",function(req,res){
  if(req.isAuthenticated()){
    if(req.user.Mode == "Buyer"){
      CompleteProduct.find({Category : "Men's Wear"},function(err,foundProduct){
        if(!err){
          if(foundProduct){
            var cart = [];
            BuyerProducts.findOne({Username : req.user.Username},function(err,foundPerson){
              if(!err){
                if(foundPerson){

                  foundPerson.MyCart.forEach(function(product){
                    cart.push(product.ProductID);

                  });

                  res.render("BuyerProducts/MensWear",{fullName : req.user.Fullname, AllProducts : foundProduct,cart : cart});

                }
              }
            });
          }
        }
      });
    }
    else{
      SellerProducts.findOne({Username : req.user.Username},function(err,foundPerson){
        if(!err){
          if(foundPerson){
            const result = foundPerson.Products.filter(product => product.Category == "Men's Wear");
            console.log(result);
            res.render("products/MensWear",{fullName : req.user.Fullname,MyProducts : result});
          }
        }
      });
    }
  }
  else{
    req.flash('success_msg',"You must log in to continue");
    res.redirect("/login");
  }
});

app.get("/dashboard/Women'sWear",function(req,res){
  if(req.isAuthenticated()){
    if(req.user.Mode == "Buyer"){
      CompleteProduct.find({Category : "Women's Wear"},function(err,foundProduct){
        if(!err){
          if(foundProduct){
            var cart = [];
            BuyerProducts.findOne({Username : req.user.Username},function(err,foundPerson){
              if(!err){
                if(foundPerson){

                  foundPerson.MyCart.forEach(function(product){
                    cart.push(product.ProductID);

                  });

                  res.render("BuyerProducts/Womenswear",{fullName : req.user.Fullname, AllProducts : foundProduct,cart : cart});

                }
              }
            });
          }
        }
      });
    }
    else{
      SellerProducts.findOne({Username : req.user.Username},function(err,foundPerson){
        if(!err){
          if(foundPerson){
            const result = foundPerson.Products.filter(product => product.Category == "Women's Wear");
            console.log(result);
            res.render("products/Womenswear",{fullName : req.user.Fullname,MyProducts : result});
          }
        }
      });
    }
  }
  else{
    req.flash('success_msg',"You must log in to continue");
    res.redirect("/login");
  }
});

app.get("/dashboard/Shoes",function(req,res){
  if(req.isAuthenticated()){
    if(req.user.Mode == "Buyer"){
      CompleteProduct.find({Category : "Shoes"},function(err,foundProduct){
        if(!err){
          if(foundProduct){
            var cart = [];
            BuyerProducts.findOne({Username : req.user.Username},function(err,foundPerson){
              if(!err){
                if(foundPerson){

                  foundPerson.MyCart.forEach(function(product){
                    cart.push(product.ProductID);

                  });

                  res.render("BuyerProducts/Shoes",{fullName : req.user.Fullname, AllProducts : foundProduct,cart : cart});

                }
              }
            });
          }
        }
      });
    }
    else{
      SellerProducts.findOne({Username : req.user.Username},function(err,foundPerson){
        if(!err){
          if(foundPerson){
            const result = foundPerson.Products.filter(product => product.Category == "Shoes");
            console.log(result);
            res.render("products/Shoes",{fullName : req.user.Fullname,MyProducts : result});
          }
        }
      });
    }
  }
  else{
    req.flash('success_msg',"You must log in to continue");
    res.redirect("/login");
  }
});

app.get("/dashboard/HomeAccomidites",function(req,res){
  if(req.isAuthenticated()){
    if(req.user.Mode == "Buyer"){
      CompleteProduct.find({Category : "Home accomodities"},function(err,foundProduct){
        if(!err){
          if(foundProduct){
            var cart = [];
            BuyerProducts.findOne({Username : req.user.Username},function(err,foundPerson){
              if(!err){
                if(foundPerson){

                  foundPerson.MyCart.forEach(function(product){
                    cart.push(product.ProductID);

                  });

                  res.render("BuyerProducts/homeaccomodities",{fullName : req.user.Fullname, AllProducts : foundProduct,cart : cart});

                }
              }
            });
          }
        }
      });
    }
    else{
      SellerProducts.findOne({Username : req.user.Username},function(err,foundPerson){
        if(!err){
          if(foundPerson){
            const result = foundPerson.Products.filter(product => product.Category == "Home accomodities");
            console.log(result);
            res.render("products/homeaccomodities",{fullName : req.user.Fullname,MyProducts : result});
          }
        }
      });
    }
  }
  else{
    req.flash('success_msg',"You must log in to continue");
    res.redirect("/login");
  }
});

app.get("/dashboard/Stationery",function(req,res){
  if(req.isAuthenticated()){
    if(req.user.Mode == "Buyer"){
      CompleteProduct.find({Category : "Stationery"},function(err,foundProduct){
        if(!err){
          if(foundProduct){
            var cart = [];
            BuyerProducts.findOne({Username : req.user.Username},function(err,foundPerson){
              if(!err){
                if(foundPerson){

                  foundPerson.MyCart.forEach(function(product){
                    cart.push(product.ProductID);

                  });

                  res.render("BuyerProducts/Stationery",{fullName : req.user.Fullname, AllProducts : foundProduct,cart : cart});

                }
              }
            });
          }
        }
      });
    }
    else{
      SellerProducts.findOne({Username : req.user.Username},function(err,foundPerson){
        if(!err){
          if(foundPerson){
            const result = foundPerson.Products.filter(product => product.Category == "Stationery");
            console.log(result);
            res.render("products/Stationery",{fullName : req.user.Fullname,MyProducts : result});
          }
        }
      });
    }
  }
  else{
    req.flash('success_msg',"You must log in to continue");
    res.redirect("/login");
  }
});

app.get("/dashboard/Utensils",function(req,res){
  if(req.isAuthenticated()){
    if(req.user.Mode == "Buyer"){
      CompleteProduct.find({Category : "Utensils"},function(err,foundProduct){
        if(!err){
          if(foundProduct){
            var cart = [];
            BuyerProducts.findOne({Username : req.user.Username},function(err,foundPerson){
              if(!err){
                if(foundPerson){

                  foundPerson.MyCart.forEach(function(product){
                    cart.push(product.ProductID);

                  });

                  res.render("BuyerProducts/Utensils",{fullName : req.user.Fullname, AllProducts : foundProduct,cart : cart});

                }
              }
            });
          }
        }
      });
    }
    else{
      SellerProducts.findOne({Username : req.user.Username},function(err,foundPerson){
        if(!err){
          if(foundPerson){
            const result = foundPerson.Products.filter(product => product.Category == "Utensils");
            console.log(result);
            res.render("products/Utensils",{fullName : req.user.Fullname,MyProducts : result});
          }
        }
      });
    }
  }
  else{
    req.flash('success_msg',"You must log in to continue");
    res.redirect("/login");
  }
});

app.get("/dashboard/DecorativeThings",function(req,res){
  if(req.isAuthenticated()){
    if(req.user.Mode == "Buyer"){
      CompleteProduct.find({Category : "Decorative Things"},function(err,foundProduct){
        if(!err){
          if(foundProduct){
            var cart = [];
            BuyerProducts.findOne({Username : req.user.Username},function(err,foundPerson){
              if(!err){
                if(foundPerson){

                  foundPerson.MyCart.forEach(function(product){
                    cart.push(product.ProductID);

                  });

                  res.render("BuyerProducts/decorativeThings",{fullName : req.user.Fullname, AllProducts : foundProduct,cart : cart});

                }
              }
            });
          }
        }
      });
    }
    else{
      SellerProducts.findOne({Username : req.user.Username},function(err,foundPerson){
        if(!err){
          if(foundPerson){
            const result = foundPerson.Products.filter(product => product.Category == "Decorative Things");
            console.log(result);
            res.render("products/decorativeThings",{fullName : req.user.Fullname,MyProducts : result});
          }
        }
      });
    }
  }
  else{
    req.flash('success_msg',"You must log in to continue");
    res.redirect("/login");
  }
});

app.get("/dashboard/Chocolates",function(req,res){
  if(req.isAuthenticated()){
    if(req.user.Mode == "Buyer"){
      CompleteProduct.find({Category : "Chocolates"},function(err,foundProduct){
        if(!err){
          if(foundProduct){
            var cart = [];
            BuyerProducts.findOne({Username : req.user.Username},function(err,foundPerson){
              if(!err){
                if(foundPerson){

                  foundPerson.MyCart.forEach(function(product){
                    cart.push(product.ProductID);

                  });

                  res.render("BuyerProducts/chocolates",{fullName : req.user.Fullname, AllProducts : foundProduct,cart : cart});

                }
              }
            });
          }
        }
      });
    }
    else{
      SellerProducts.findOne({Username : req.user.Username},function(err,foundPerson){
        if(!err){
          if(foundPerson){
            const result = foundPerson.Products.filter(product => product.Category == "Chocolates");
            console.log(result);
            res.render("products/chocolates",{fullName : req.user.Fullname,MyProducts : result});
          }
        }
      });
    }
  }
  else{
    req.flash('success_msg',"You must log in to continue");
    res.redirect("/login");
  }
});

app.get("/dashboard/others",function(req,res){
  if(req.isAuthenticated()){
    if(req.user.Mode == "Buyer"){
      CompleteProduct.find({Category : "Others"},function(err,foundProduct){
        if(!err){
          if(foundProduct){
            var cart = [];
            BuyerProducts.findOne({Username : req.user.Username},function(err,foundPerson){
              if(!err){
                if(foundPerson){

                  foundPerson.MyCart.forEach(function(product){
                    cart.push(product.ProductID);

                  });

                  res.render("BuyerProducts/others",{fullName : req.user.Fullname, AllProducts : foundProduct,cart : cart});

                }
              }
            });
          }
        }
      });
    }
    else{
      SellerProducts.findOne({Username : req.user.Username},function(err,foundPerson){
        if(!err){
          if(foundPerson){
            const result = foundPerson.Products.filter(product => product.Category == "Others");
            console.log(result);
            res.render("products/others",{fullName : req.user.Fullname,MyProducts : result});
          }
        }
      });
    }
  }
  else{
    req.flash('success_msg',"You must log in to continue");
    res.redirect("/login");
  }
});

app.get("/dashboard/viewProducts/clearAll",function(req,res){
  if(req.isAuthenticated()){
    if(req.user.Mode == "Seller"){
       SellerProducts.findOne({Username : req.user.Username},function(err,foundPerson){
         if(!err){
           if(foundPerson){
             foundPerson.Products = [];
             foundPerson.save();
             CompleteProduct.deleteMany({Username : req.user.Username},function(err){
               if(err) throw err;
             });
             req.flash('success_msg',"Cleared everything successfully");
             res.redirect("/dashboard/viewProducts");
           }
         }
       })
    }
    else{
      req.flash('success_msg',"You are not a seller");
      res.redirect("/login");
    }
  }
  else{
    req.flash('success_msg',"You must log in to continue");
    res.redirect("/login");
  }
});

app.get("/logout",function(req,res){
  req.logout();
  req.flash('success_msg',"You are logged out");
  res.redirect("/login");
});

app.get("/forgotPassword",function(req,res){
  res.render("forgotPassword");
});

app.get("/forgotPassword/otp",function(req,res){
  res.render("otp");
});

app.get("/dashboard/uploadProducts",function(req,res){
  if(req.isAuthenticated()){
    if(req.user.Mode == "Seller"){
    res.render("upload");
  }
  else{
    req.flash('success_msg',"You are not a seller");
    res.redirect("/login");
  }
  }
  else{
    req.flash('success_msg',"You must log in to continue");
    res.redirect("/login");
  }

});

// app.get("/uploadProducts",function(req,res){
//   res.render("upload");
// })

app.get("/dashboard/mycart",function(req,res){
  if(req.isAuthenticated()){
    if(req.user.Mode == "Buyer"){
      BuyerProducts.findOne({Username : req.user.Username},function(err,foundPerson){
        if(!err){
          if(foundPerson){
            CompleteProduct.find({},function(err,foundProduct){
              if(!err){
                if(foundProduct){
                  var common = [];
                  foundProduct.forEach(function(product){
                    for(var i = 0; i<foundPerson.MyCart.length; i++){
                      if(product.ProductID == foundPerson.MyCart[i].ProductID){
                        common.push(product);
                      }
                    }
                  });
                   res.render("mycart",{myCart : foundPerson.MyCart,common : common});
                }
              }
            })

          }
        }
      });

  }
  else{
    req.flash('success_msg',"You are not a buyer");
    res.redirect("/login");
  }
  }
  else{
    req.flash('success_msg',"You must log in to continue");
    res.redirect("/login");
  }
});

app.post("/dashboard/myCart/:id",function(req,res){
  if(req.isAuthenticated()){
    if(req.user.Mode == "Buyer"){
      var id = req.params.id;
      console.log(id);

      CompleteProduct.findById(id,function(err,foundProduct){
        if(!err){
          if(foundProduct){

            BuyerProducts.findOne({Username : req.user.Username},function(err,foundPerson){
              if(!err){
                if(foundPerson){

                  foundPerson.MyCart.push({
                    ProductName : foundProduct.ProductName,
                    ProductID : foundProduct.ProductID,
                    SellerName : foundProduct.Username,
                    Quantity : req.body.quantity,
                    Price : foundProduct.Price,
                    Category : foundProduct.Category,
                    Description : foundProduct.Description,
                    Image : foundProduct.Image,
                    isAdded : "Yes"
                  });
                  foundPerson.save();
                  SellerProducts.findOne({Username : foundProduct.Username},function(err,foundSeller){
                    if(!err){
                      if(foundSeller){
                        foundSeller.Products.forEach(function(eachProduct){
                          if(eachProduct.ProductID == foundProduct.ProductID){
                            eachProduct.Quantity = String(parseInt(eachProduct.Quantity)  - req.body.quantity) ;
                          }
                        });
                        foundSeller.save();
                      }
                    }
                  });
                  CompleteProduct.findOne({ProductID : foundProduct.ProductID},function(err,product){
                    if(!err){
                      if(product){
                        product.Quantity = String(parseInt(product.Quantity)  - req.body.quantity);
                        product.save();
                      }
                    }
                  })
                  res.redirect("/dashboard");
                }
              }
            })

          }
        }

      });

  }
  else{
    req.flash('success_msg',"You are not a buyer");
    res.redirect("/login");
  }
  }
  else{
    req.flash('success_msg',"You must log in to continue");
    res.redirect("/login");
  }
})

app.get("/dashboard/orderHistory",function(req,res){
  if(req.isAuthenticated()){
    if(req.user.Mode == "Buyer"){
      BuyerProducts.findOne({Username : req.user.Username},function(err,foundPerson){
        if(!err){
          if(foundPerson){
            res.render("orders/buyer-order",{orderHistory : foundPerson.OrderHistory});
          }
        }
      });

  }
  else{
    SellerProducts.findOne({Username : req.user.Username},function(err,foundPerson){
      if(!err){
        if(foundPerson){
          res.render("orders/seller-order",{purchaseDetails : foundPerson.PurchaseDetails});
        }
      }
    })

  }
  }
  else{
    req.flash('success_msg',"You must log in to continue");
    res.redirect("/login");
  }
});

app.get("/dashboard/profile",function(req,res){
  if(req.isAuthenticated()){
    res.render("profile",{
      name : req.user.Fullname,
      username : req.user.Username,
      email : req.user.Emailaddress,
      mode : req.user.Mode,
    });
  }
  else{
    req.flash('success_msg',"You must log in to continue");
    res.redirect("/login");
  }
});

app.get("/delete",function(req,res){
  if(req.isAuthenticated()){
      User.deleteOne({Emailaddress : req.user.Emailaddress},function(err){
        if(!err){
          req.flash('success_msg',"Successfully deleted");
          res.redirect("/register");
        }
      });
  }
  else{
    req.flash('success_msg',"You must log in to continue");
    res.redirect("/login");
  }
});

app.get("/dashboard/viewProducts",function(req,res){
  if(req.isAuthenticated()){
    if(req.user.Mode == "Seller"){
       SellerProducts.findOne({Username : req.user.Username},function(err,foundProduct){
         if(!err){
           if(foundProduct){
             res.render("view-all-products",{AllProducts : foundProduct.Products});

           }
           else{
            res.render("view-all-products",{AllProducts : []});
           }
         }
       });
    }
    else{
      req.flash('success_msg',"You are not a seller");
      res.redirect("/login");
    }
  }
  else{
    req.flash('success_msg',"You must log in to continue");
    res.redirect("/login");
  }
});

app.get("/dashboard/viewProducts/delete/:id",function(req,res){

  if(req.isAuthenticated()){
    if(req.user.Mode == "Seller"){
    var id = req.params.id;
    SellerProducts.findOne({Username : req.user.Username},function(err,foundPerson){
      if(!err){
        if(foundPerson){
          const finalResult = foundPerson.Products.find(el => el._id == id);
          const requiredId = finalResult.ProductID;
          console.log(requiredId);
          CompleteProduct.deleteOne({ProductID : requiredId},function(err){
            if(err) throw err;
          });
          const index = foundPerson.Products.indexOf(finalResult);
          foundPerson.Products.splice(index,1);
          foundPerson.save();
          req.flash('success_msg',"Deleted Successfully");
          res.redirect("/dashboard/viewProducts");
        }
      }
    });


    console.log("Deleted");

  }
  else{
    req.flash('success_msg',"You are not a seller");
    res.redirect("/login");
  }
  }
else{
  req.flash('success_msg',"You must log in to continue");
  res.redirect("/login");
}
});

app.get("/dashboard/viewProducts/view/:id",function(req,res){

  if(req.isAuthenticated()){
    if(req.user.Mode == "Seller"){
    var id = req.params.id;
    SellerProducts.findOne({Username : req.user.Username},function(err,foundPerson){
      if(!err){
        if(foundPerson){
          const finalResult = foundPerson.Products.find(el => el._id == id);

          const index = foundPerson.Products.indexOf(finalResult);
          res.render("view-one-product",{AllProducts : foundPerson.Products[index]});
        }
      }
    });




  }
  else{
    req.flash('success_msg',"You are not a seller");
    res.redirect("/login");
  }
  }
else{
  req.flash('success_msg',"You must log in to continue");
  res.redirect("/login");
}
});


app.get("/dashboard/viewProducts/edit/:id",function(req,res){
  if(req.isAuthenticated()){
    if(req.user.Mode == "Seller"){
    var id = req.params.id;
     SellerProducts.findOne({Username : req.user.Username},function(err,foundPerson){
       if(!err){
         if(foundPerson){
           const finalResult = foundPerson.Products.find(el => el._id == id);

           const index = foundPerson.Products.indexOf(finalResult);
           editProduct = foundPerson.Products[index];
           console.log(editProduct);
           res.redirect("/dashboard/viewProducts/editProducts");
         }
       }
     });
  }
  else{
    req.flash('success_msg',"You are not a seller");
    res.redirect("/login");
  }
  }
else{
  req.flash('success_msg',"You must log in to continue");
  res.redirect("/login");
}

});

app.get("/dashboard/viewProducts/editProducts",function(req,res){
  if(req.isAuthenticated()){
    if(req.user.Mode == "Seller"){
      res.render("edit-products",{editProduct : editProduct});
    }
    else{

    }
  }

});

app.get("/dashboard/myCart/removeFromCart/:id",function(req,res){
     var quantityCheck;
  if(req.isAuthenticated()){
    if(req.user.Mode == "Buyer"){
      var id = req.params.id;
      BuyerProducts.findOne({Username : req.user.Username},function(err,foundPerson){
        if(!err){
          if(foundPerson){
            foundPerson.MyCart.forEach(function(product){
              if(product.ProductID == id){
                const index = foundPerson.MyCart.indexOf(product);
                foundPerson.MyCart.splice(index,1);
                foundPerson.save();
                 quantityCheck = product.Quantity;

              }
            })
          }
        }
      })

      CompleteProduct.findOne({ProductID : id},function(err,foundProduct){
        if(!err){
          if(foundProduct){
            foundProduct.Quantity = String(parseInt(foundProduct.Quantity) + parseInt(quantityCheck));
            foundProduct.save();
            SellerProducts.find({},function(err,foundSeller){
              if(!err){
                if(foundSeller){
                  foundSeller.forEach(function(element){
                    for(var k = 0; k<element.Products.length; k++){
                      if(element.Products[k].ProductID == id){
                        element.Products[k].Quantity = foundProduct.Quantity;
                        element.save();
                      }
                    }
                  })
                }
              }
            })

          }
        }
      })
      req.flash('success_msg',"Removed Successfully");
      res.redirect("/dashboard/mycart");
    }
    else{
      req.flash('success_msg',"You are not a Buyer");
      res.redirect("/login");
    }
  }
  else{
    req.flash('success_msg',"You must log in to continue");
    res.redirect("/login");
  }

});

app.get("/dashboard/mycart/checkout",function(req,res){
  if(req.isAuthenticated()){
    if(req.user.Mode == "Buyer"){
      var currentdate = new Date();
      var datetime = currentdate.getDate() + "/"
            + (currentdate.getMonth()+1)  + "/"
            + currentdate.getFullYear() + " @ "
            + currentdate.getHours() + ":"
            + currentdate.getMinutes() + ":"
            + currentdate.getSeconds();
          BuyerProducts.findOne({Username : req.user.Username},function(err,foundPerson){
            if(!err){
              if(foundPerson){
                var bill = [];
                var total = 0;
                foundPerson.MyCart.forEach(function(ele){
                    foundPerson.OrderHistory.push({
                    ProductName : ele.ProductName,
                    ProductID : ele.ProductID,
                    SellerName : ele.SellerName,
                    Quantity : ele.Quantity,
                    Price : ele.Price,
                    Category : ele.Category,
                    Description : ele.Category,
                    Image : ele.Image,
                    Date : datetime
                  });
                  bill.push({
                    ProductName : ele.ProductName,
                    ProductID : ele.ProductID,
                    SellerName : ele.SellerName,
                    Quantity : ele.Quantity,
                    Price : ele.Price,
                    Category : ele.Category,
                    Description : ele.Category,
                    Image : ele.Image,
                    Date : datetime
                  });
                  total = total + parseInt(ele.Price) * parseInt(ele.Quantity);
                  SellerProducts.findOne({Username : ele.SellerName},function(err,foundSeller){
                    if(!err){
                      if(foundSeller){
                        foundSeller.PurchaseDetails.push({
                          ProductIDForPurchase : ele.ProductID,
                          ProductNameForPurchase : ele.ProductName,
                          QuantityPurchased :ele.Quantity,
                          CustomerName : req.user.Username,
                          DateOfPurchase : datetime,
                          Price  : ele.Price,
                          Category : ele.Category,
                          Description : ele.Description,
                          Image : ele.Image
                        });
                        foundSeller.save();
                      }
                    }
                  })
                });
                foundPerson.MyCart = [];
                foundPerson.save();
                req.flash('success_msg',"Checked out successfully");
                      res.render("bill",{bill : bill,total : total});
                }
            }
          });
          // BuyerProducts.findOne({Username : req.user.Username},function(err,foundBuyer){
          //   if(!err){
          //     if(foundBuyer){
          //       foundBuyer.OrderHistory.forEach(function(order){
          //         SellerProducts.findOne({Username : order.SellerName},function(err,foundSeller){
          //           if(!err){
          //             if(foundSeller){
          //                 foundSeller.PurchaseDetails.push({
          //                 ProductIDForPurchase : order.ProductID,
          //                 ProductNameForPurchase : order.ProductName,
          //                 QuantityPurchased :order.Quantity,
          //                 CustomerName : req.user.Username,
          //                 DateOfPurchase : datetime,
          //                 Price  : order.Price,
          //                 Category : order.Category,
          //                 Description : order.Description,
          //                 Image : order.Image
          //               });
          //               foundSeller.save();
          //             }
          //           }
          //         });
          //       });
          //       req.flash('success_msg',"Checked out successfully");
          //       res.redirect("/dashboard");
          //     }
          //   }
          // });
    }
    else{
      req.flash('success_msg',"You are not a buyer");
      res.redirect("/login");
    }
  }
  else{
    req.flash('success_msg',"You must log in to continue");
    res.redirect("/login");
  }
})

app.get("/dashboard/mycart/clearAll",function(req,res){
  if(req.isAuthenticated()){
    if(req.user.Mode == "Buyer"){
        BuyerProducts.findOne({Username : req.user.Username},function(err,foundPerson){
          if(!err){
            if(foundPerson){
              foundPerson.MyCart.forEach(function(ele){
                CompleteProduct.findOne({ProductID : ele.ProductID},function(err,foundProduct){
                  if(!err){
                    if(foundProduct){
                      foundProduct.Quantity = String(parseInt(foundProduct.Quantity) + parseInt(ele.Quantity));
                      foundProduct.save();
                      SellerProducts.find({},function(err,foundSeller){
                        if(!err){
                          if(foundSeller){
                            foundSeller.forEach(function(seller){
                              for(var k = 0;k <seller.Products.length; k++){
                                if(seller.Products[k].ProductID == ele.ProductID){
                                  seller.Products[k].Quantity = foundProduct.Quantity;
                                  seller.save();


                                }
                              }
                            })
                          }
                        }
                      })
                    }
                  }
                })
              })
              foundPerson.MyCart = [];
              foundPerson.save();
              req.flash('success_msg',"Cleared Cart Successfully");
              res.redirect("/dashboard/mycart");
            }
          }
        })
    }
    else{
      req.flash('success_msg',"You are not a Buyer");
      res.redirect("/login");
    }
  }
  else{
    req.flash('success_msg',"You must log in to continue");
    res.redirect("/login");
  }
})

app.post("/register",function(req,res){

    const {name,username,email,mode,password,confirmPassword} = req.body;
var errors = [];
  const passwordCheck = passwordSchema.validate(password);
if(!passwordCheck){
  errors.push("Password must contain atleast one uppercase letter, one lowercase letter, no spaces, at least one digit and at least 8 characters. ")
}
if(password != confirmPassword){
  errors.push("Passwords do not match");
}

if(errors.length >0){
  check = false;
  res.render("register",{errors : errors,emailError : '',userNameError:''});
}

else{

User.findOne({Emailaddress : email},function(err,foundUser){
  if(!err){
    if(foundUser){
       res.render("register",{emailError : "Email already exists", userNameError : '', errors : errors});
    }
    else{
      User.findOne({Username : username},function(err,foundUser){
        if(!err){
          if(foundUser){
            res.render("register",{emailError  : '',userNameError : "Username already exists", errors : errors});
          }
          else{
            const user = new User({
            Fullname : req.body.fullName,
            Username : req.body.username,
            Emailaddress : req.body.email,
            Mode : req.body.mode,
            Password : bcrypt.hashSync(req.body.password, salt),
            ConfirmPassword : bcrypt.hashSync(req.body.confirmPassword, salt)
          });
          user.save();
          if(req.body.mode == "Seller"){
          const sellerProduct = new SellerProducts({
            Username : req.body.username
          });

          sellerProduct.save();
        }
        else{
          const buyerProduct = new BuyerProducts({
            Username : req.body.username
          });
          buyerProduct.save();
        }
        req.flash('success_msg','You are now registered and can log in');
        res.redirect("/login");
          }
        }
      });
    }
  }
  else{
    console.log(err);
  }
});
}

});

app.post("/login",function(req,res,next){
  passport.authenticate("local",{
    successRedirect : "/dashboard",
    failureRedirect : "/login",
    failureFlash : true
  })(req,res,next);
});


app.post("/dashboard/upload",upload,function(req,res){
  if(req.isAuthenticated()){

    if(req.user.Mode == "Seller"){
      if(isImage("uploads/" + req.file.filename)){
        var check = false;
        var product = {
          productName : req.body.productName,
          category : req.body.category,
          price : req.body.price,
          quantity : req.body.quantity,
          product_id : req.body.product_id,
          description : req.body.description,
          image : req.body.file
        };
        var dimensions = sizeOf("public/uploads/" + req.file.filename);
        if((dimensions.height > 225) || (dimensions.width > 225) || (dimensions.type != 'png')){
          req.flash('success_msg','Image not supported');
          res.redirect("/dashboard/uploadProducts");
        }
        else{
        SellerProducts.find({},function(err,foundProduct){
          if(!err){
            if(foundProduct){
              foundProduct.forEach(function(element){
                for(var i =0; i<element.Products.length; i++){
                  if(element.Products[i].ProductID == product.product_id){
                    check = true;
                    console.log(check);
                    req.flash('success_msg','Product ID already exists');
                    res.redirect("/dashboard/uploadProducts");
                  }
                }


              });

            }
             if(!check){

              SellerProducts.findOne({Username : req.user.Username},function(err,foundPerson){
                if(!err){
                  if(foundPerson){
                    foundPerson.Products.push({
                      ProductName : product.productName,
                      Price : product.price,
                      Category : product.category,
                      Description : product.description,
                      Quantity : product.quantity,
                      ProductID : product.product_id,
                      Image : req.file.filename
                    });

                    foundPerson.save();

                    const completeProduct = new CompleteProduct({
                      Username : req.user.Username,
                      Mode : req.user.Mode,
                      ProductName : product.productName,
                      Price : product.price,
                      Category : product.category,
                      Description : product.description,
                      Quantity : product.quantity,
                      ProductID : product.product_id,
                      Image : req.file.filename
                    });

                    completeProduct.save();

                    console.log(req.file.filename);
                    req.flash('success_msg','Uploaded Successfully');
                    res.redirect("/dashboard/uploadProducts");
                  }
                }
              });
            }
          }
        });

  }

      }
      else{
        req.flash('success_msg','Image Format not supported');
        res.redirect("/dashboard/uploadProducts");
      }
      }




    else{
      req.flash('success_msg','You are not a seller');
      res.redirect("/login");
    }
  }
  else{
    req.flash('success_msg','You must log in to conitue');
    res.redirect("/login");
  }
});

app.post("/editProducts",upload,function(req,res){
  if(req.isAuthenticated()){
      console.log(req.file);
      if(isImage("public/uploads/" + req.file.filename)){
        var dimensions = sizeOf("public/uploads/" + req.file.filename);
        if((dimensions.height > 225) || (dimensions.width > 225) || (dimensions.type != 'png')){
          req.flash('success_msg','Image not supported');
          res.redirect("/dashboard/viewProducts/editProducts");
        }
        else{
        SellerProducts.findOne({Username : req.user.Username},function(err,foundPerson){
          if(!err){
            if(foundPerson){
              foundPerson.Products.forEach(function(product){
                if(product.ProductID == editProduct.ProductID){
                  product.ProductName = req.body.productName;
                  product.Price = req.body.price;
                  product.Quantity = req.body.quantity;
                  product.Description = req.body.description;
                  product.Image = req.file.filename;
                  product.Category = req.body.category;
                  CompleteProduct.findOne({ProductID : editProduct.ProductID},function(err,foundProduct){
                    if(!err){
                      if(foundProduct){
                        foundProduct.ProductName = req.body.productName;
                        foundProduct.Price = req.body.price;
                        foundProduct.Quantity = req.body.quantity;
                        foundProduct.Description = req.body.description;
                        foundProduct.Image = req.file.filename;
                        foundProduct.Category = req.body.category;
                        foundProduct.save();
                      }
                    }
                  })
                }
              });
              foundPerson.save();
              req.flash('success_msg','Updated Successfully');
              res.redirect("/dashboard/viewProducts");
            }
          }
        });
      }
      }
      else{
        req.flash('success_msg','Image Not supported');
        res.redirect("/dashboard/viewProducts/editProducts");
      }

  }
});

app.get("/editProductsWithoutImage",function(req,res){
  if(req.isAuthenticated()){
    SellerProducts.findOne({Username : req.user.Username},function(err,foundPerson){
      if(!err){
        if(foundPerson){
          foundPerson.Products.forEach(function(product){
            if(product.ProductID == editProduct.ProductID){
              product.ProductName = req.query.productName;
              product.Price = req.query.price;
              product.Quantity = req.query.quantity;
              product.Description = req.query.description;

              product.Category = req.query.category;
              CompleteProduct.findOne({ProductID : editProduct.ProductID},function(err,foundProduct){
                if(!err){
                  if(foundProduct){
                    foundProduct.ProductName = req.query.productName;
                    foundProduct.Price = req.query.price;
                    foundProduct.Quantity = req.query.quantity;
                    foundProduct.Description = req.query.description;

                    foundProduct.Category = req.query.category;
                    foundProduct.save();
                  }
                }
              })
            }
          });
          foundPerson.save();
          req.flash('success_msg','Updated Successfully');
          res.redirect("/dashboard/viewProducts");
        }
      }
    });
    console.log(req.query);
  }
})

app.post("/dashboard/viewProducts/SearchResults",function(req,res){
  if(req.isAuthenticated()){

     SellerProducts.findOne({Username : req.user.Username},function(err,foundPerson){
       if(!err){
         if(foundPerson){
            result = foundPerson.Products.filter(s => s.ProductName.includes(req.body.searchProductName));
           res.render("search",{SearchProduct : result, AllProducts : foundPerson.Products});
         }
       }
     });
  }

});

app.post("/dashboards/myCart/editQuantity",function(req,res){
  if(req.isAuthenticated()){
    var quantityAvailable = String(parseInt(req.body.quantityAvailable) - parseInt(req.body.editquantity));
    BuyerProducts.findOne({Username : req.user.Username},function(err,foundPerson){
      if(!err){
        if(foundPerson){
          foundPerson.MyCart.forEach(function(product){
            if(product.ProductID == req.body.clickedBtn){
              product.Quantity = req.body.editquantity;
              foundPerson.save();
            }
          });
        }
      }
    })
    SellerProducts.find({},function(err,foundSeller){
       if(!err){
         if(foundSeller){
           foundSeller.forEach(function(element){
             for(var k = 0;k<element.Products.length; k++){
               if(element.Products[k].ProductID == req.body.clickedBtn){
                 element.Products[k].Quantity = quantityAvailable;
                 element.save();
               }
             }
           });
         }
       }
    });
    CompleteProduct.findOne({ProductID : req.body.clickedBtn},function(err,foundProduct){
      if(!err){
        if(foundProduct){
          foundProduct.Quantity = quantityAvailable;
          foundProduct.save();
          res.redirect("/dashboard/mycart")
        }
      }
    });
  }
});

app.get("/dashboard/myCart/SearchResults",function(req,res){
  if(req.isAuthenticated()){

     BuyerProducts.findOne({Username : req.user.Username},function(err,foundPerson){
       if(!err){
         if(foundPerson){
           var result = [];
            result = foundPerson.MyCart.filter(s => s.ProductName.includes(req.query.searchCartName));

            CompleteProduct.find({},function(err,foundProduct){
              if(!err){
                if(foundProduct){
                  var common = [];
                  foundProduct.forEach(function(product){
                    for(var i = 0; i<result.length; i++){
                      if(product.ProductID == result[i].ProductID){
                        common.push(product);
                      }
                    }
                  });
                  res.render("view-onecart",{SearchCart : result, AllCartProducts : foundPerson.MyCart,common : common});
                }
                else{
                  res.send("Not Found");
                }
              }
            })
          }
        }
        });




  }






})

app.post("/dashboard/SearchResultsBuyer",function(req,res){
  if(req.isAuthenticated()){

    CompleteProduct.find({},function(err,foundProduct){
      if(!err){
        if(foundProduct){


          result = foundProduct.filter(s => s.ProductName.includes(req.body.searchcartProduct));
          console.log(foundProduct.filter(s => s.ProductName.includes(req.body.searchcartProduct)));

          var cart = [];
          BuyerProducts.findOne({Username : req.user.Username},function(err,foundPerson){
            if(!err){
              if(foundPerson){

                foundPerson.MyCart.forEach(function(product){
                  cart.push(product.ProductID);

                });

                res.render("searchCartBuyer",{fullName : req.user.Fullname, AllProducts : result,cart : cart});

              }
            }
          });
        }
      }
    });
  }
})

app.get("/graph",function(req,res){
  if(req.isAuthenticated()){
    if(req.user.Mode == "Seller"){
    var finalArray = []
    BuyerProducts.find({},function(err,foundPerson){
      if(!err){
        if(foundPerson){
          foundPerson.forEach(function(e){
            for(var i =0;i <e.OrderHistory.length;i++){
              if(e.OrderHistory[i].SellerName == req.user.Username){
                finalArray.push(e.OrderHistory[i]);
              }
            }
          });
          var currentdate = new Date();
          arr1 = [];
          arr2 =[];
          for(var k=0;k<7;k++){
          var datetime1 = (currentdate.getDate() - k) + "/"
                + (currentdate.getMonth()+1)  + "/"
                + currentdate.getFullYear();
              arr1.push(datetime1);
              const check = finalArray.filter(s => s.Date.includes(datetime1));
              var count2 = 0;
              check.forEach(function(e){
                count2 = count2 + parseInt(e.Quantity);

              });
              arr1.push(count2);
}
res.render("graph",{details : arr1});

        }
      }
    })
  }
  else{
    req.flash('success_msg','You are not a Seller');
    res.redirect("/login");
  }
  }
  else{
    req.flash('success_msg','You must Log in to continue');
    res.redirect("/login");
  }
})










app.listen("3000",function(){
  console.log("Server started at port 3000");
});
