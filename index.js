const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require("cors");
const { default: axios } = require("axios");
const app = express();
const port = process.env.PORT || 5000;

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
            const initiateData = {
                store_id: "rj66b37da699b3f",
                store_passwd: "rj66b37da699b3f@ssl",
                total_amount: paymentInfo?.amount,
                currency: "EUR",
                tran_id: tnxId,
                success_url: "http://localhost:5000/success-payment",
                fail_url: "http://localhost:5000/fail-payment",
                cancel_url: "http://localhost:5000/cancel-payment",
                cus_name: "Customer Name",
                cus_email: "cust@yahoo.com",
                cus_add1: "Dhaka",
                cus_add2: "Dhaka",
                cus_city: "Dhaka",
                cus_state: "Dhaka",
                cus_postcode: "1000",
                cus_country: "Bangladesh",
                cus_phone: "01711111111",
                cus_fax: "01711111111",
                shipping_method: "NO",
                product_name: "laptop",
                product_category: "laptptop",
                product_profile: "laptpop",
                ship_name: "Customer Name",
                ship_add1: "Dhaka",
                ship_add2: "Dhaka",
                ship_city: "Dhaka",
                ship_state: "Dhaka",
                ship_postcode: "1000",
                ship_country: "Bangladesh",
                multi_card_name: "mastercard,visacard,amexcard",
                value_a: "ref001_A",
                value_b: "ref002_B",
                value_c: "ref003_C",
                value_d: "ref004_D"
            }
            const response = await axios({
                method: "POST",
                url: "https://sandbox.sslcommerz.com/gwprocess/v4/api.php",
                data: initiateData,
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                }
            });
            // const response =await axios.post('https://sandbox.sslcommerz.com/gwprocess/v4/api.php',initiateData)

            // console.log(response.data);
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
                res.send({ paymentUrl: response.data?.GatewayPageURL })
            }
        })
        app.post('/success-payment', async (req, res) => {
            const successData = req.body;
            if (successData.status !== "VALID") {
                throw new Error("invalid")
            }
            const filter = {
                paymentTnxIdId: successData.tran_id
            }
            const updateInfo = {
                $set: {
                    status: "success"
                }
            }
            const updateData = await paymentInfoCollection.updateOne(filter, updateInfo)
            console.log("successDataasdsadasdasdasasdasasasdasasd: ", successData);
            console.log("updateData:::", updateData);
            res.redirect('http://localhost:5173/successPage')
        })
        app.post('/fail-payment', async (req, res) => {
            // status: 'FAILED',
            const successData = req.body;
            if (successData.status !== "FAILED") {
                throw new Error("invalid")
            }
            const filter = {
                paymentTnxIdId: successData.tran_id
            }
            const updateInfo = {
                $set: {
                    status: "FAILED"
                }
            }
            const updateData = await paymentInfoCollection.updateOne(filter, updateInfo)
            console.log("fail-response", successData);
            res.redirect('http://localhost:5173/failPage')
        })
        app.post('/cancel-payment', async (req, res) => {
            // status: 'CANCELLED',
            const successData = req.body;
            if (successData.status !== "CANCELLED") {
                throw new Error("invalid")
            }
            const filter = {
                paymentTnxIdId: successData.tran_id
            }
            const updateInfo = {
                $set: {
                    status: "CANCELLED"
                }
            }
            const updateData = await paymentInfoCollection.updateOne(filter, updateInfo)
            console.log("cancle-response", successData);
            res.redirect('http://localhost:5173/cancelPage')
        })

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
