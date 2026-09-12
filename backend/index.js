// Dependencies
const bcrypt = require("bcryptjs");
const cors = require("cors");
const chalk = require("chalk");
const crypto = require("crypto");
const express = require("express");
const mongoose = require("mongoose");

const User = require("./models/user.model");
const Client = require("./models/client.model");
const CallLog = require("./models/call.model");
const Counter = require("./models/counter.model");
const Audit = require("./models/audit.model");

// Configurations
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(
  cors({
    origin: process.env.ORIGIN,
    credentials: true,
  })
);

const success = chalk.green;
const failure = chalk.red;
const info = chalk.blue;

const backfillClientAndCallIds = async () => {
  await Client.updateMany({ address: { $exists: true } }, { $unset: { address: 1 } });
  await CallLog.updateMany({}, { $unset: { callDate: 1, callDuration: 1 } });
  await Client.updateMany({}, { $rename: { emailId: "email_id", phoneNumber: "phone_number", conversionProbability: "conversion_probability" } });
  await CallLog.updateMany({}, { $rename: { clientId: "client_id", createdBy: "created_by" } });
  await User.updateMany({}, { $rename: { isActive: "is_active" } });
  await Promise.all([
    User.updateMany({}, { $rename: { createdAt: "created_at", updatedAt: "updated_at" } }),
    Client.updateMany({}, { $rename: { createdAt: "created_at", updatedAt: "updated_at" } }),
    CallLog.updateMany({}, { $rename: { createdAt: "created_at", updatedAt: "updated_at" } }),
    Audit.updateMany({}, { $rename: { createdAt: "created_at", updatedAt: "updated_at" } }),
    Counter.updateMany({}, { $rename: { createdAt: "created_at", updatedAt: "updated_at" } }),
  ]);
  await Audit.updateMany({ "change.attribute": "emailId" }, { $set: { "change.$[item].attribute": "email_id" } }, { arrayFilters: [{ "item.attribute": "emailId" }] });
  await Audit.updateMany({ "change.attribute": "phoneNumber" }, { $set: { "change.$[item].attribute": "phone_number" } }, { arrayFilters: [{ "item.attribute": "phoneNumber" }] });
  await Audit.updateMany({ "change.attribute": "conversionProbability" }, { $set: { "change.$[item].attribute": "conversion_probability" } }, { arrayFilters: [{ "item.attribute": "conversionProbability" }] });
  await Audit.updateMany({ "change.attribute": "isActive" }, { $set: { "change.$[item].attribute": "is_active" } }, { arrayFilters: [{ "item.attribute": "isActive" }] });
  const existingClients = await Client.find({ client_id: { $regex: /^CLIENT_[0-9]{7}$/ } }).select("client_id").lean();
  const highestClientNumber = existingClients.reduce((highest, client) => Math.max(highest, Number(client.client_id.slice(-7))), 0);
  await Counter.findOneAndUpdate(
    { key: "client_id" },
    { $max: { value: highestClientNumber } },
    { upsert: true, setDefaultsOnInsert: true }
  );

  const clientsWithoutIds = await Client.find({ $or: [{ client_id: { $exists: false } }, { client_id: null }] }).sort({ created_at: 1 });
  for (const client of clientsWithoutIds) {
    const sequence = await Counter.findOneAndUpdate(
      { key: "client_id" },
      { $inc: { value: 1 } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    await Client.updateOne({ _id: client._id }, { $set: { client_id: `CLIENT_${String(sequence.value).padStart(7, "0")}` } });
  }

  const clients = await Client.find({ client_id: { $exists: true } }).select("_id client_id call_details").lean();
  for (const client of clients) {
    const calls = await CallLog.find({ _id: { $in: client.call_details || [] } }).sort({ created_at: 1 });
    for (let index = 0; index < calls.length; index += 1) {
      if (!calls[index].call_id) {
        await CallLog.updateOne({ _id: calls[index]._id }, { $set: { call_id: `${client.client_id}_CALL_${index + 1}` } });
      }
    }
  }
};

// Database connnection initiation
mongoose.connect(process.env.DB_URL);
const db = mongoose.connection;

db.on("error", () => {
  console.log("Database Connection:", failure("FAILED"));
});
db.once("open", async () => {
  console.log("Database Connection:", success("SUCCESS"));

  try {
    await backfillClientAndCallIds();
    const existingSystemAdmin = await User.findOne({ user_type: "SYSTEM_ADMIN" });

    if (existingSystemAdmin) {
      console.log("SYSTEM_ADMIN already exists:", info(existingSystemAdmin.email));
      return;
    }

    const password = process.env.SYSTEM_ADMIN_PASSWORD;
    const hashedPassword = await bcrypt.hash(password, 10);

    const adminUser = await User.create({
      name: "Amritesh Anand",
      email: "amritesh2901@gmail.com",
      password: hashedPassword,
      user_type: "SYSTEM_ADMIN",
    });

    console.log("SYSTEM_ADMIN created:", success(adminUser.email));
  } catch (error) {
    console.log("SYSTEM_ADMIN bootstrap failed:", failure(error.message));
  }
});

require("./routes/auth.route")(app);
require("./routes/client.route")(app);
require("./routes/audit.route")(app);
require("./routes/monitoring.route")(app);
// require("./routes/resources.route")(app);
// require("./routes/views.route")(app);


app.get("/request", (req, res) => {
  console.log("Request received");
  res.send("Request received");
})

app.listen(process.env.PORT, () => {
  console.log("Server active at PORT:", info(process.env.PORT));
});
