const express = require("express");
const router = require("./routes/index.js");
const { sequelize } = require("../database/models/");

const app = express();

app.use(express.json());

app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", message: "Server is running" });
});
app.use("/api", router);

app.listen({ port: 5000 }, async () => {
  console.log("Server running on http://localhost:5000");
  await sequelize.authenticate();
  console.log("Database connected");
});
