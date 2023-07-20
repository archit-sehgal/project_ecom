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
let id = 0;
const ADMINS = [];
const PRODUCTS = [
    {
        productname: "iphone 6s",
        price: 30000,
        pimage: "https://buyapple.co.za/wp-content/uploads/2021/08/iphone-6s-plus-rose-gold-1.jpg",
        pid: Math.floor(Math.random() * 10000).toString()
    }, {
        productname: "iphone x",
        price: 55000,
        pimage: "https://s3b.cashify.in/gpro/uploads/2019/07/04134341/apple-iphone-x-front.jpg",
        pid: Math.floor(Math.random() * 10000).toString()
    }, {
        productname: "iphone 14 pro",
        price: 135000,
        pimage: "https://www.visible.com/shop/assets/images/shop/iPhone_14_Pro_Max_DEE_1.jpg",
        pid: Math.floor(Math.random() * 10000).toString()
    }, {
        productname: "samsung galaxy s12",
        price: 105000,
        pimage: "https://i0.wp.com/dryotech.com/wp-content/uploads/2022/12/Samsung-Galaxy-S12.jpg?resize=735%2C413&ssl=1",
        pid: Math.floor(Math.random() * 10000).toString()
    },
];
mongoose
    .connect("mongodb://127.0.0.1:27017/productsdb")
    .then(() => {
        console.log("mongodb is connected")
    })
    .catch((err) => {
        console.log("mongodb err" + err);
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
async function updateProductsInDB() {
    try {
        await Product.deleteMany({}); // Clear the existing products in the database
        const productsToAdd = PRODUCTS.map((product) => ({
            productname: product.productname,
            price: product.price,
            pimage: product.pimage,
            pid: product.pid,
        }));
        await Product.insertMany(productsToAdd); // Add the products from the PRODUCTS array to the database
        console.log("Products updated in the database.");
    } catch (err) {
        console.error("Error updating products in the database:", err);
    }
}
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
app.get("/", (req, res) => {
    res.render("home", { PRODUCTS: PRODUCTS });
})

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
let isCartInitialized = false;

app.get("/cart", (req, res) => {
    const productId = req.query.productid;

    const findProduct = PRODUCTS.find((p) => p.pid === productId);
    if (findProduct) {
        const selectedProduct = {
            productname: findProduct.productname,
            price: findProduct.price,
            pid: findProduct.pid,
            pimage: findProduct.pimage,
        };

        // Check if the cart is already initialized
        if (isCartInitialized) {
            const checkproduucttoadd = totalproducts.find((a) => a.pid === selectedProduct.pid);
            if (checkproduucttoadd) {
                res.render("cart", { cart: cart, selectedproduct: totalproducts });
            } else {
                totalproducts.push(selectedProduct);
                cart += selectedProduct.price;
                res.render("cart", { cart: cart, selectedproduct: totalproducts });
            }
        } else {
            // If the cart is not initialized, add the selected product and update the cart
            totalproducts.push(selectedProduct);
            cart += selectedProduct.price;
            isCartInitialized = true;
            res.render("cart", { cart: cart, selectedproduct: totalproducts });
        }
    } else {
        res.render("cart", { cart: cart, selectedproduct: totalproducts });
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
    const pname = req.query.productname;
    const findproduct = PRODUCTS.findIndex((a) => a.productname === pname);
    if (findproduct !== -1) {
        var selectedproduct = {
            productname: PRODUCTS[findproduct].productname,
            price: PRODUCTS[findproduct].price,
            pid: PRODUCTS[findproduct].pid,
            pimage: PRODUCTS[findproduct].pimage
        };
        res.render("checkout", { selectedproduct: selectedproduct });
    } else {
        res.status(404).send("Product not found");
    }
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
app.post("/list_product", (req, res) => {
    var newproduct = {
        productname: req.body.pname,
        price: req.body.price,
        pimage: req.body.pimage,
        pid: id + 1
    }
    PRODUCTS.push(newproduct);
    // Update products in the database whenever a new product is added to the PRODUCTS array
    updateProductsInDB();

    res.redirect("/");
})

updateProductsInDB()
    .then(() => {
        app.listen(3000, () => {
            console.log("Server started on port 3000");
        });
    })
    .catch((error) => {
        console.error("Error initializing the database:", error);
    });