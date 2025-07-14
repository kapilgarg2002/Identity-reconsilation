const express = require("express");
const router = express.Router();
const identityController = require("../controllers/index");

router.post("/identify", identityController.identify);

module.exports = router;
