const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require("dotenv").config();
const jwt = require('jsonwebtoken');
const stripe = require("stripe")(process.env.STRIPE_SECRETE_KEY)
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.pz6rkt0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
          // Connect the client to the server
          // await client.connect();
          const userCollection = client.db("onlineShop").collection("users");
          const productCategoryCollection = client.db("onlineShop").collection("categoryCollections");
          const addedProductCollection = client.db("onlineShop").collection("addProduct");
          const myCartCollection = client.db("onlineShop").collection("myCart");
          const myFavoriteItemCollection = client.db("onlineShop").collection("myFavoriteItem");
          const OrderedProductCollection = client.db("onlineShop").collection("myOrderedProduct");
          const exchangeProductInfoCollection = client.db("onlineShop").collection("exchangeInfo");


          // jwt api
          app.post('/jwt', async (req, res) => {
               const user = req.body;
               console.log("user from jwt", user);
               const token = jwt.sign(user, process.env.ACCESS_TOKEN, { expiresIn: '1h' });
               res.send({ token })
          })
          const verifyToken = (req, res, next) => {
               console.log("inside verifyToken", req.headers.authorization);
               if (!req.headers.authorization) {
                    return res.status(401).send({ message: "Authorized access" })
               }
               const token = req.headers.authorization.split(" ")[1];
               // console.log("inside token", token);
               jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
                    if (err) {
                         return res.status(401).send({ message: "Authorized access" })
                    }
                    console.log("decoded", decoded);
                    // console.log("decoded email", req.decoded.email);
                    req.decoded = decoded;
                    console.log("res.decoded", req.decoded.email);
                    next();
               })

          }
          const verifyAdmin = async (req, res, next) => {
               const email = req.decoded.email;
               const query = { email: email };
               const user = await userCollection.findOne(query);
               const isAdmin = user?.role === "admin";
               if (!isAdmin) {
                    return res.status(403).send({ message: "Forbidden access" })
               }
               next();
          }
          // User api
          app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
               // console.log(req.headers);
               const result = await userCollection.find().toArray();
               res.send(result)
          })
          // app.get("/users/:id", async (req, res) => {
          //      const id = req.params.id;
          //      const query = { _id: new ObjectId (id) };
          //      result = await userCollection.findOne(query);
          //      res.send(result);
          // });
          app.get("/users/admin/:email", verifyToken, async (req, res) => {
               const email = req.params?.email;
               if (email !== req.decoded.email) {
                    return res.status(403).send({ message: "Forbidden access" })
               }
               const query = { email: email }
               // console.log("Email from logged user:", email);
               const user = await userCollection.findOne(query);
               console.log("/users/admin/:email", user);
               let admin = false;
               if (user) {
                    admin = user?.role === "admin"
               }
               res.send({ admin });
          });
          app.post("/users", async (req, res) => {
               const user = req.body;
               // console.log("body", user);
               const query = { email: user.email }
               // console.log(query);
               // console.log(user);
               const existingUser = await userCollection.findOne(query)
               if (existingUser) {
                    return res.send({ message: "user already exists on database" })
               }
               const result = await userCollection.insertOne(user);
               res.send(result)
          });
          app.patch("/users/:id", async (req, res) => {
               const id = req.params.id;
               const filter = { _id: new ObjectId(id) };
               const updatedProductInfo = req.body;
               // console.log("updatedProductInfo", updatedProductInfo);
               const updateProduct = {
                    $set: {
                         role: updatedProductInfo.role,
                    },
               };
               // console.log("updateProduct", updateProduct);
               const result = await userCollection.updateOne(
                    filter,
                    updateProduct
               );
               console.log("result", result);
               res.send(result);
          });
          app.delete("/users/:id", async (req, res) => {
               const id = req.params.id;
               const query = { _id: new ObjectId(id) };
               const result = await userCollection.deleteOne(query);
               res.send(result);
          })

          // categoryCollection api
          app.get('/categoryCollections', async (req, res) => {
               const result = await productCategoryCollection.find().toArray();
               res.send(result)
          })
          app.get("/categoryCollections/:id", async (req, res) => {
               const id = req.params.id;
               const query = { _id: new ObjectId(id) }
               const result = await productCategoryCollection.findOne(query)
               res.send(result)
          })
          app.post('/categoryCollections', async (req, res) => {
               const categoryInfo = req.body
               console.log(categoryInfo);
               const result = await productCategoryCollection.insertOne(categoryInfo)
               res.send(result)
          })
          app.put("/categoryCollections/:id", async (req, res) => {
               const id = req.params.id;
               const updatedInfo = req.body;
               console.log("updatedInfo", updatedInfo);
               const filter = { _id: new ObjectId(id) };
               const options = { upsert: true };
               const updatedItems = {
                    category: updatedInfo.category,
                    subCategories: updatedInfo.subCategories,
               };
               console.log("updatedItems", updatedItems);
               // console.log("updated info", updatedItems);
               const result = await productCategoryCollection.updateOne(filter, { $set: { ...updatedItems } }, options)
               res.send(result);
          });
          app.delete("/categoryCollections/:id", async (req, res) => {
               const id = req.params.id;
               console.log(id);
               const query = { _id: new ObjectId(id) };
               const result = await productCategoryCollection.deleteOne(query);
               res.send(result);
          })

          // Add product api form frontend
          // app.get("/addProduct", async (req, res) => {
          //      const filter = req.query;
          //      // console.log(filter);
          //      const query = {
          //           product_name: { $regex: new RegExp(filter.search, "i") },
          //           product_Category: { $regex: new RegExp(filter.category, "i") },
          //      };
          //      const result = await AddedProductCollection.find(query).toArray();
          //      res.send(result)
          // })
          app.get("/addProduct", async (req, res) => {
               const filter = req.query;
               console.log(filter);
               // Extract search and category from query parameters
               const { search = "", category = "", subCategory = "" } = filter;
               // Construct query based on search and category
               const query = {};
               if (search) {
                    query.product_name = { $regex: new RegExp(search, "i") };
               }
               if (category && category !== "All") {
                    query.product_Category = { $regex: new RegExp(category, "i") };
               }
               if (subCategory && subCategory !== "All") {
                    query.product_subCategory = { $regex: new RegExp(subCategory, "i") };
               }
               try {
                    // Find products based on the constructed query
                    const result = await addedProductCollection.find(query).toArray();
                    res.send(result);
               } catch (error) {
                    console.error("Error fetching products:", error);
                    res.status(500).send("Internal server error");
               }
          });
          app.get("/addProduct/:id", async (req, res) => {
               const id = req.params.id;
               const query = { _id: new ObjectId(id) }
               const result = await addedProductCollection.findOne(query)
               res.send(result)
          })
          app.post("/addProduct", verifyToken, verifyAdmin, async (req, res) => {
               const addedProduct = req.body;
               console.log(addedProduct);
               const result = await addedProductCollection.insertOne(addedProduct)
               res.send(result)
          })
          // Update
          app.put("/addProduct/:id", verifyToken, verifyAdmin, async (req, res) => {
               const id = req.params.id;
               // console.log("params", id);
               const updatedInfo = req.body;
               console.log("updatedInfo", updatedInfo);
               const filter = { _id: new ObjectId(id) };
               const options = { upsert: true };
               const updatedItems = {
                    product_name: updatedInfo.product_name,
                    product_Category: updatedInfo.product_Category,
                    product_subCategory: updatedInfo.product_subCategory,
                    product_price: updatedInfo.product_price,
                    product_discount: updatedInfo.product_discount,
                    product_discountedPrice: updatedInfo.product_discountedPrice,
                    product_quantity: updatedInfo.product_quantity,
                    product_rating: updatedInfo.product_rating,
                    description: updatedInfo.description,
                    image: updatedInfo.image,
                    product_totalSell: updatedInfo.product_totalSell,
                    product_updatedBy: updatedInfo.product_updatedBy,
                    product_updatedTime: updatedInfo.product_updatedTime
               };
               console.log("updated info", updatedItems);
               const result = await addedProductCollection.updateOne(filter, { $set: { ...updatedItems } }, options)
               res.send(result);
          });
          app.patch("/addProduct/:id", async (req, res) => {
               const id = req.params.id;
               const filter = { _id: new ObjectId(id) };
               const updatedProductInfo = req.body;
               console.log("updatedProductInfo", updatedProductInfo);
               const updateProduct = {
                    $set: {
                         product_quantity: updatedProductInfo.afterOrderQuantity,
                         product_totalSell: updatedProductInfo.finalSell,
                    },
               };
               console.log("updateProduct", updateProduct);
               const result = await addedProductCollection.updateMany(
                    filter,
                    updateProduct
               );
               console.log("result", result);
               res.send(result);
          });
          app.delete("/addProduct/:id", verifyToken, verifyAdmin, async (req, res) => {
               const id = req.params.id;
               const query = { _id: new ObjectId(id) };
               const result = await addedProductCollection.deleteOne(query);
               res.send(result);
          })
          app.delete("/addProduct", async (req, res) => {
               const product = req.body;
               const result = await addedProductCollection.deleteMany({});
               res.send(result)
          })
          // app.delete("/purchasedFoods", async (req, res) => {
          //      const result = await purchasedFoodCollection.deleteMany({});
          //      res.send(result);
          // });

          // My Cart api
          app.get("/myCart", async (req, res) => {
               const email = req.query.email
               // console.log("query email from myCart", email);
               const query = { email: email }
               const result = await myCartCollection.find(query).toArray();
               res.send(result)
          })
          // app.get("/myCart", async (req, res) => {
          //      const result = await myCartCollection.find().toArray();
          //      res.send(result);
          // });
          app.get("/myCart/:id", async (req, res) => {
               const id = req.params.id;
               const query = { _id: new ObjectId(id) }
               const result = await myCartCollection.findOne(query)
               res.send(result)
          })
          app.post("/myCart", async (req, res) => {
               const addedProduct = req.body;
               console.log(addedProduct);
               const result = await myCartCollection.insertOne(addedProduct)
               res.send(result)
          })
          app.delete("/myCart/:id", async (req, res) => {
               const id = req.params.id;
               const query = { _id: new ObjectId(id) };
               const result = await myCartCollection.deleteOne(query);
               res.send(result);
          });

          // My myFavoriteItemCollection api
          app.get("/myFavoriteItem", async (req, res) => {
               const email = req.query.email
               console.log("query email from myCart", email);
               const query = { email: email }
               const result = await myFavoriteItemCollection.find(query).toArray();
               res.send(result)
          })
          app.get("/myFavoriteItem/:id", async (req, res) => {
               const id = req.params.id;
               const query = { _id: new ObjectId(id) }
               const result = await myFavoriteItemCollection.findOne(query)
               res.send(result)
          })
          app.post("/myFavoriteItem", async (req, res) => {
               const addedProduct = req.body;
               console.log(addedProduct);
               const result = await myFavoriteItemCollection.insertOne(addedProduct)
               res.send(result)
          })
          app.delete("/myFavoriteItem/:id", async (req, res) => {
               const id = req.params.id;
               const query = { _id: new ObjectId(id) };
               const result = await myFavoriteItemCollection.deleteOne(query);
               res.send(result);
          });

          // customer order collection

          app.get("/myOrderedProduct", async (req, res) => {
               // const { customer_email } = req.query; // Correctly access customer_email
               // console.log("query email", customer_email);
               try {
                    //   const query = { "customerInfo?.customer_email": customer_email }; // Query to find by customer_email
                    const result = await OrderedProductCollection.find().toArray();
                    res.send(result);
               } catch (error) {
                    console.error("Error fetching ordered products:", error);
                    res.status(500).send("Internal Server Error");
               }
          });
          app.get("/myOrderedProduct/:id", async (req, res) => {
               const id = req.params.id;
               const query = { _id: new ObjectId(id) }
               const result = await OrderedProductCollection.findOne(query)
               res.send(result)
          })
          app.post("/myOrderedProduct", async (req, res) => {
               const addedProduct = req.body;
               console.log(addedProduct);
               const result = await OrderedProductCollection.insertOne(addedProduct)
               res.send(result)
          })
          app.delete("/myOrderedProduct/:id", async (req, res) => {
               const id = req.params.id;
               const query = { _id: new ObjectId(id) };
               const result = await OrderedProductCollection.deleteOne(query);
               res.send(result);
          });
          app.patch("/myOrderedProduct/:id", async (req, res) => {
               const id = req.params.id;
               const filter = { _id: new ObjectId(id) };
               const updatedProductInfo = req.body;
               // const options = { upsert: true };
               console.log("updatedProductInfo", updatedProductInfo);
               const updateProduct = {
                    $set: {
                         delivery: updatedProductInfo.delivery,
                         "paymentInfo.paymentStatus": updatedProductInfo.paymentStatus,
                         "paymentInfo.transactionId": updatedProductInfo.transactionId,
                         "exchangeInfo.exchangeDurationTime": updatedProductInfo.exchangeDurationTime
                    },
               };
               // console.log("updateProduct", updateProduct);
               const result = await OrderedProductCollection.updateMany(
                    filter,
                    updateProduct
               );
               console.log("result", result);
               res.send(result);
          });


          // payment methods
          app.post('/create-payment-intent', async (req, res) => {
               const { price } = req.body;
               const amount = parseInt(price * 100);
               console.log(amount, 'amount');
               // Create a PaymentIntent with the order amount and currency
               const paymentIntent = await stripe.paymentIntents.create({
                    amount: amount,
                    currency: "usd",
                    payment_method_types: ['card']
               });
               res.send({
                    clientSecret: paymentIntent.client_secret,
               })
          });

          // verifyToken, verifyAdmin,
          // stats or analysis
          app.get('/admin-stats', async (req, res) => {
               const totalUsers = await userCollection.estimatedDocumentCount()
               const totalProduct = await addedProductCollection.estimatedDocumentCount();
               const totalOrder = await OrderedProductCollection.estimatedDocumentCount();
               // const revenues = await OrderedProductCollection.find().toArray();
               // const totals = revenues.reduce((total, price) => total + price.orderInfo.TotalOrderProductPrice, 0)
               const calculateRevenue = await OrderedProductCollection.aggregate([
                    {
                         $group: {
                              _id: null,
                              totalRev: {
                                   $sum: '$orderInfo.TotalOrderProductPrice'
                              }
                         }
                    }
               ]).toArray();
               const totalRevenue = calculateRevenue.length > 0 ? calculateRevenue[0].totalRev : 0
               // Count categories and subcategories
               const categoryResult = await productCategoryCollection.aggregate([
                    {
                         $project: {
                              subCategories: {
                                   $ifNull: ["$subCategories", []] // Ensure subcategories is an array
                              }
                         }
                    },
                    {
                         $group: {
                              _id: null,
                              totalCategories: { $sum: 1 },
                              totalSubcategories: { $sum: { $size: "$subCategories" } }
                         }
                    }
               ]).toArray();
               // Extract totalCategories and totalSubcategories from the aggregation result
               const totalCategories = categoryResult.length > 0 ? categoryResult[0].totalCategories : 0;
               const totalSubcategories = categoryResult.length > 0 ? categoryResult[0].totalSubcategories : 0;
               // Calculate payments
               const calculatePayments = await OrderedProductCollection.aggregate([
                    {
                         $group: {
                              _id: null,
                              totalPaymentPaid: {
                                   $sum: {
                                        $cond: [{ $eq: ["$paymentInfo.paymentStatus", "Paid"] }, 1, 0]
                                   }
                              },
                              totalPaymentPending: {
                                   $sum: {
                                        $cond: [{ $eq: ["$paymentInfo.paymentStatus", "Not-Paid"] }, 1, 0]
                                   }
                              }
                         }
                    }
               ]).toArray();
               // Extract total payments done and pending from the aggregation result
               const totalPaymentPaid = calculatePayments.length > 0 ? calculatePayments[0].totalPaymentPaid : 0;
               const totalPaymentPending = calculatePayments.length > 0 ? calculatePayments[0].totalPaymentPending : 0
               // Calculate delivery
               const calculateDelivery = await OrderedProductCollection.aggregate([
                    {
                         $group: {
                              _id: null,
                              totalDeliveryDone: {
                                   $sum: {
                                        $cond: [{ $eq: ["$delivery", "Received"] }, 1, 0]
                                   }
                              },
                              totalDeliveryPending: {
                                   $sum: {
                                        $cond: [{ $eq: ["$delivery", "Pending"] }, 1, 0]
                                   }
                              }
                         }
                    }
               ]).toArray();
               // Extract total delivery done and pending from the aggregation result
               const totalDeliveryDone = calculateDelivery.length > 0 ? calculateDelivery[0].totalDeliveryDone : 0;
               const totalDeliveryPending = calculateDelivery.length > 0 ? calculateDelivery[0].totalDeliveryPending : 0
               // Calculate Exchange Products
               const calculateExchangeInfo = await exchangeProductInfoCollection.aggregate([
                    {
                         $group: {
                              _id: null,
                              pending: {
                                   $sum: {
                                        $cond: [{ $eq: ["$responseFromAdmin", "pending"] }, 1, 0]
                                   }
                              },
                              accepted: {
                                   $sum: {
                                        $cond: [{ $eq: ["$responseFromAdmin", "Accepted"] }, 1, 0]
                                   }
                              },
                              declined: {
                                   $sum: {
                                        $cond: [{ $eq: ["$responseFromAdmin", "Declined"] }, 1, 0]
                                   }
                              },
                              deliveryDone: {
                                   $sum: {
                                        $cond: [{ $eq: ["$delivery", "Delivery_Receive"] }, 1, 0]
                                   }
                              },
                              deliveryPending: {
                                   $sum: {
                                        $cond: [{ $eq: ["$delivery", "Delivery_Pending"] }, 1, 0]
                                   }
                              },
                         }
                    }
               ]).toArray();
               // Extract total delivery done and pending from the aggregation result
               const totalExchangeProductRequest = await exchangeProductInfoCollection.estimatedDocumentCount();
               const totalExchangeProductRequestPending = calculateExchangeInfo.length > 0 ? calculateExchangeInfo[0].pending : 0;
               const totalExchangeProductRequestAccepted = calculateExchangeInfo.length > 0 ? calculateExchangeInfo[0].accepted : 0;
               const totalExchangeProductRequestDeclined = calculateExchangeInfo.length > 0 ? calculateExchangeInfo[0].declined : 0;
               const totalExchangeableProductDeliveryDone = calculateExchangeInfo.length > 0 ? calculateExchangeInfo[0].deliveryDone : 0
               const totalExchangeableProductDeliveryPending = calculateExchangeInfo.length > 0 ? calculateExchangeInfo[0].deliveryPending : 0
               res.send({
                    totalUsers, totalProduct, totalOrder, totalRevenue, totalCategories, totalSubcategories, totalPaymentPaid, totalPaymentPending, totalDeliveryDone, totalDeliveryPending, totalExchangeProductRequest, totalExchangeProductRequestPending, totalExchangeProductRequestAccepted, totalExchangeProductRequestDeclined, totalExchangeableProductDeliveryDone, totalExchangeableProductDeliveryPending
               })
          })

          // exchange API
          app.get("/exchangeInfo", async (req, res) => {
               try {
                    const result = await exchangeProductInfoCollection.find().toArray();
                    res.send(result);
               } catch (error) {
                    console.error("Error fetching ordered products:", error);
                    res.status(500).send("Internal Server Error");
               }
          });
          app.get("/exchangeInfo/:id", async (req, res) => {
               const id = req.params.id;
               const query = { _id: new ObjectId(id) }
               const result = await exchangeProductInfoCollection.findOne(query)
               res.send(result)
          })
          app.post("/exchangeInfo", async (req, res) => {
               const exchangeInfo = req.body;
               console.log(exchangeInfo);
               const result = await exchangeProductInfoCollection.insertOne(exchangeInfo)
               res.send(result)
          })
          app.patch("/exchangeInfo/:id", async (req, res) => {
               const id = req.params.id;
               const filter = { _id: new ObjectId(id) };
               const updatedProductInfo = req.body;
               // const options = { upsert: true };
               console.log("updatedProductInfo", updatedProductInfo);
               const updateProduct = {
                    $set: {
                         responseFromAdmin: updatedProductInfo.responseFromAdmin,
                         adminMessage: updatedProductInfo.adminMessage,
                         delivery: updatedProductInfo.delivery
                    },
               };
               // console.log("updateProduct", updateProduct);
               const result = await exchangeProductInfoCollection.updateOne(
                    filter,
                    updateProduct
               );
               console.log("result", result);
               res.send(result);
          });
          app.delete("/exchangeInfo/:id", async (req, res) => {
               const id = req.params.id;
               const query = { _id: new ObjectId(id) };
               const result = await exchangeProductInfoCollection.deleteOne(query);
               res.send(result);
          });

          // Send a ping to confirm a successful connection
          await client.db("admin").command({ ping: 1 });
          console.log("Pinged your deployment. You successfully connected to MongoDB!");
     } finally {
          // Ensures that the client will close when you finish/error
          // await client.close();
     }
}
run().catch(console.dir);

app.get("/", (req, res) => {
     res.send("online shop server is running..");
});

app.listen(port, () => {
     console.log(`online shop server is running on port ${port}`);
});
