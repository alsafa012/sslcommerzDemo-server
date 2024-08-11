const express = require("express");
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require("cors");
const app = express();
const { default: axios } = require("axios");
const nodemailer = require('nodemailer');
const port = process.env.PORT || 5000;
// Configure the email transport using SMTP
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.APP_USER, // Replace with your Gmail address
        pass: process.env.APP_PASS, // Replace with your Gmail password or app-specific password
    },
});
// const formData = require('form-data');
//   const Mailgun = require('mailgun.js');
//   const mailgun = new Mailgun(formData);
// const mg = mailgun.client({ username: 'api', key: process.env.MAILGUN_API_KEY });
// middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded());
// sslcommerzDemo
// hwDqXiNlbcgkPGPc
const uri = "mongodb+srv://sslcommerzDemo:hwDqXiNlbcgkPGPc@cluster0.pz6rkt0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

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

        const paymentInfoCollection = client.db("sslCommerzDemo").collection("paymentInfo");

        app.get("/paymentInfo", async (req, res) => {
            // console.log(req.headers);
            const result = await paymentInfoCollection.find().toArray();
            res.send(result)
        })

        // step-1: Initiate-payment
        // -> 

        app.post("/create-payment", async (req, res) => {
            const paymentInfo = req.body;
            const tnxId = new ObjectId().toString();
            // const initiateData = new URLSearchParams({}).toString()
            const initiateData = {
                store_id: process.env.STORE_ID,
                store_passwd: process.env.STORE_PASSWD,
                total_amount: paymentInfo?.amount,
                currency: "BDT",
                tran_id: tnxId,
                success_url: "http://localhost:5000/success-payment",
                fail_url: "http://localhost:5000/fail-payment",
                cancel_url: "http://localhost:5000/cancel-payment",
                cus_name: "RIDOY",
                cus_email: "alsafa012@gmail.com",
                cus_add1: "Dhaka1",
                cus_add2: "Dhaka2",
                cus_city: "Dhaka3",
                cus_state: "Dhaka4",
                cus_postcode: "1000",
                cus_country: "Bangladesh",
                cus_phone: "01711111111",
                cus_fax: "01711111111",
                shipping_method: "NO",
                product_name: "laptop-451 sds sdsd",
                product_category: "laptptop",
                product_profile: "laptpop",
                ship_name: "AL-SAFA",
                ship_add1: "Dhaka11",
                ship_add2: "Dhaka22",
                ship_city: "Dhaka33",
                ship_state: "Dhaka44",
                ship_postcode: "10004",
                ship_country: "Bangladesh",
                multi_card_name: "mastercard,visacard,amexcard",
                value_a: "ref001_A",
                value_b: "ref002_B",
                value_c: "ref003_C",
                value_d: "ref004_D"
            }
            console.log("initiateData", initiateData);
            const response = await axios({
                method: "POST",
                url: "https://sandbox.sslcommerz.com/gwprocess/v4/api.php",
                data: initiateData,
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                }
            });
            // const response =await axios.post('https://sandbox.sslcommerz.com/gwprocess/v4/api.php',initiateData)

            // console.log(response.data.status === "SUCCESS");
            const saveData = {
                customer_name: "okk",
                paymentTnxIdId: tnxId,
                amount: paymentInfo?.amount,
                status: "pending"
            }
            const result = await paymentInfoCollection.insertOne(saveData);

            console.log("response?.data?.successData", response?.data?.successData);
            console.log("response.data", response.data);
            if (result) {
                res.send({ response: response?.data, paymentUrl: response.data?.GatewayPageURL })
            }
        })
        // Reusable function to handle payment status update
        const handlePaymentStatus = async (req, res, expectedStatus, redirectUrl) => {
            const successData = req.body;
            console.log("successDataasdsadasdasdasasdasasasdasasd: ", successData);
            if (successData.status !== expectedStatus) {
                throw new Error(`Invalid status: expected ${expectedStatus}, received ${successData.status}`);
            }
            const filter = { paymentTnxIdId: successData.tran_id };
            const updateInfo = {
                $set: {
                    status: expectedStatus,
                    tran_date: successData.tran_date,
                    card_type: successData.card_type,
                    store_amount: successData.store_amount,
                    card_no: successData.card_no,
                    bank_tran_id: successData.bank_tran_id
                }
            };
            await paymentInfoCollection.updateOne(filter, updateInfo);

            // Send success email if the payment is successful

            if (expectedStatus === "VALID") {
                const mailOptions = {
                    from: process.env.APP_USER, // My Gmail address
                    to: 'rjridoy012@gmail.com', // customer email
                    subject: 'Payment Successful',
                    // text: `Your payment of ${successData.store_amount} was successful. Transaction ID: ${successData.tran_id}`,
                    html: `<div>
                    <h2>Your payment of ${successData.store_amount} was successful.</h2>
                    <h3>Your Transaction ID: ${successData.tran_id}</h3>
                    <h4>amount: ${successData.amount}</h4>
                    <h4>tran_date: ${successData.tran_date}</h4>
                    <h4>card_type: ${successData.card_type}</h4>
                    </div>`
                };
                transporter.sendMail(mailOptions, (error, info) => {
                    if (error) {
                        console.error("Error sending success email:", error);
                    } else {
                        console.log("Success email sent successfully:", info.response);
                        res.send({response: response})
                    }
                });
                // mailgun
                // mg.messages.create('sandbox-123.mailgun.org', {
                // // mg.messages.create('sandbox83d61979a56847deabb8819fc126cbb6.mailgun.org', {
                //     from: "Excited User <postmaster@sandbox83d61979a56847deabb8819fc126cbb6.mailgun.org>",
                //     to: ["alsafa012@gmail.com"],
                //     subject: "Hello",
                //     text: "Testing some Mailgun awesomeness!",
                //     html: "<h1>Testing some Mailgun awesomeness!</h1>"
                // })
                // .then(msg => console.log(msg)) // logs response data
                // .catch(err => console.log(err)); // logs any error
            }
            res.redirect(redirectUrl);
        };

        // Route for success-payment
        app.post('/success-payment', (req, res) => {
            handlePaymentStatus(req, res, "VALID", 'http://localhost:5173/successPage');
        });

        // Route for fail-payment
        app.post('/fail-payment', (req, res) => {
            handlePaymentStatus(req, res, "FAILED", 'http://localhost:5173/failPage');
        });

        // Route for cancel-payment
        app.post('/cancel-payment', (req, res) => {
            handlePaymentStatus(req, res, "CANCELLED", 'http://localhost:5173/cancelPage');
        });
        // app.post('/success-payment', async (req, res) => {
        //     const successData = req.body;
        //     console.log("successDataasdsadasdasdasasdasasasdasasd: ", successData);
        //     if (successData.status !== "VALID") {
        //         throw new Error("invalid")
        //     }
        //     const filter = {
        //         paymentTnxIdId: successData.tran_id
        //     }
        //     const updateInfo = {
        //         $set: {
        //             status: "success",
        //             tran_date: successData.tran_date,
        //             card_type: successData.card_type,
        //             store_amount: successData.store_amount,
        //             card_no: successData.card_no,
        //             bank_tran_id: successData.bank_tran_id
        //         }
        //     }
        //     const updateData = await paymentInfoCollection.updateOne(filter, updateInfo)

        //     // res.send({successData: successData})
        //     console.log("updateData:::", updateData);
        //     res.redirect('http://localhost:5173/successPage')
        // })
        // app.post('/fail-payment', async (req, res) => {
        //     // status: 'FAILED',
        //     const successData = req.body;
        //     if (successData.status !== "FAILED") {
        //         throw new Error("invalid")
        //     }
        //     const filter = {
        //         paymentTnxIdId: successData.tran_id
        //     }
        //     const updateInfo = {
        //         $set: {
        //             status: "FAILED",
        //             tran_date: successData.tran_date,
        //             card_type: successData.card_type,
        //             store_amount: successData.store_amount,
        //             card_no: successData.card_no,
        //             bank_tran_id: successData.bank_tran_id
        //         }
        //     }
        //     const updateData = await paymentInfoCollection.updateOne(filter, updateInfo)
        //     console.log("fail-response", successData);
        //     res.redirect('http://localhost:5173/failPage')
        // })
        // app.post('/cancel-payment', async (req, res) => {
        //     // status: 'CANCELLED',
        //     const successData = req.body;
        //     if (successData.status !== "CANCELLED") {
        //         throw new Error("invalid")
        //     }
        //     const filter = {
        //         paymentTnxIdId: successData.tran_id
        //     }
        //     const updateInfo = {
        //         $set: {
        //             status: "CANCELLED",
        //             tran_date: successData.tran_date,
        //             card_type: successData.card_type,
        //             store_amount: successData.store_amount,
        //             card_no: successData.card_no,
        //             bank_tran_id: successData.bank_tran_id
        //         }
        //     }
        //     const updateData = await paymentInfoCollection.updateOne(filter, updateInfo)
        //     console.log("cancle-response", successData);
        //     res.redirect('http://localhost:5173/cancelPage')
        // })

        app.delete("/paymentInfo", async (req, res) => {
            const result = await paymentInfoCollection.deleteMany({});
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
    res.send("sslCommerzDemo..");
});

app.listen(port, () => {
    console.log(`sslCommerzDemo server is running on port ${port}`);
});
