const express = require("express")
const bodyparser = require("body-parser");
const ejs = require("ejs");
const cors = require("cors");
const { findIndex } = require("lodash");
const Razorpay = require("razorpay");
const mongoose = require("mongoose");
const app = express();

app.set('view engine', 'ejs');
app.use(bodyparser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(cors());

let login = "false";
let id = 4;
const ADMINS = [];

// mongo
const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = "mongodb+srv://ARCHITSEHGAL:Architgr8@p1.agorqts.mongodb.net/?retryWrites=true&w=majority";

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    await client.close();
  }
}
run().catch(console.dir);
// mongo
// Modify the mongoose connection to use the provided `uri` variable
mongoose
    .connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
        console.log("Mongoose connected to MongoDB Atlas");
    })
    .catch((err) => {
        console.log("Mongoose connection error:", err);
    });

const product_schema = new mongoose.Schema({
    productname: {
        type: String
    },
    price: {
        type: Number
    },
    pimage: {
        type: String
    },
    pid: {
        type: String
    }
});
const Product = new mongoose.model("product", product_schema);


// add data to db
// MIDDLEWARES
function admin_authenticate(req, res, next) {
    var newadmin = req.body.admin_name;
    var newadminpass = req.body.admin_pass;
    const checkadmin = ADMINS.find((a) => a.username === newadmin && a.password === newadminpass);
    if (checkadmin) {
        login = "success";
        next();
    } else {
        res.status(404).send("admin not found");
    }
}

// GET REQUESTS
app.get("/", async (req, res) => {
    try {
        const products = await Product.find({}); // Fetch all products from the database
        res.render("home", { PRODUCTS: products });
    } catch (err) {
        console.error("Error fetching products from the database:", err);
        res.status(500).send("Internal Server Error");
    }
});


app.get("/admin-signup", (req, res) => {
    res.render("signup");
})

app.get("/admin-login", (req, res) => {
    res.render("login");
})

app.get("/list_product", (req, res) => {
    if (login == "success") {
        res.render("list_product");
    } else {
        res.status(404).send("admin not logged in");
    }
})

// Initialize global variables
let totalproducts = [];
let cart = 0;

app.get("/cart", (req, res) => {
    const productId = req.query.productid;

    const findProduct = totalproducts.find((p) => p.pid === productId); // Check if the product is in the cart
    if (findProduct) {
        res.render("cart", { cart: cart, selectedproduct: totalproducts });
    } else {
        Product.findOne({ pid: productId }) // Fetch the selected product from the database
            .then((selectedProduct) => {
                if (selectedProduct) {
                    totalproducts.push(selectedProduct);
                    cart += selectedProduct.price;
                    res.render("cart", { cart: cart, selectedproduct: totalproducts });
                } else {
                    res.render("cart", { cart: cart, selectedproduct: totalproducts });
                }
            })
            .catch((err) => {
                console.error("Error fetching product from the database:", err);
                res.status(500).send("Internal Server Error");
            });
    }
});


app.get("/payment", (req, res) => {
    res.render("payment");
})
// razorpay
app.post("/payment", async (req, res) => {
    let { amount } = req.body;
    var instance = new Razorpay({ key_id: 'rzp_test_OCxeKJH1bSWmcu', key_secret: 'w8N6lpezi5xV8tFVq3R538EW' })

    let order = await instance.orders.create({
        amount: cart * 100,
        currency: "INR",
        receipt: "receipt#1",
        notes: {
            key1: "value3",
            key2: "value2"
        }
    })
    res.json({
        success: true,
        order,
        amount
    })
})

app.get("/checkout", (req, res) => {
    const productName = req.query.productname;
    console.log("Product Name received:", productName); // Add this line for debugging

    Product.findOne({ productname: productName }) // Fetch the selected product from the database
        .then((selectedProduct) => {
            if (selectedProduct) {
                res.render("checkout", { selectedproduct: selectedProduct });
            } else {
                console.log("Product not found in the database"); // Add this line for debugging
                res.status(404).send("Product not found");
            }
        })
        .catch((err) => {
            console.error("Error fetching product from the database:", err);
            res.status(500).send("Internal Server Error");
        });
});






// POST REQUESTS
app.post("/admin-signup", (req, res) => {
    const new_admin = {
        username: req.body.admin_name,
        password: req.body.admin_pass,
        id: Math.floor(Math.random() * 10000)
    }
    ADMINS.push(new_admin);
    res.redirect("/admin-login");
    res.render("login");
})

app.post("/admin-login", admin_authenticate, (req, res) => {
    res.redirect("/list_product");
})
app.post("/list_product", async (req, res) => {
    var newproduct = {
        productname: req.body.pname,
        price: req.body.price,
        pimage: req.body.pimage,
        pid: id++
    };

    try {
        const createdProduct = await Product.create(newproduct); // Save the new product to the database
        console.log("Product added:", createdProduct);
        res.redirect("/");
    } catch (err) {
        console.error("Error adding product to the database:", err);
        res.status(500).send("Internal Server Error");
    }
});


const Port = process.env.port || 8080;

app.listen(Port, () => {
    console.log("Server started on port " + Port);
});