const identityService = require("../services/index");

class IdentityController {
  async identify(req, res) {
    try {
      const { email, phoneNumber } = req.body;

      // Validation
      if (!email && !phoneNumber) {
        return res.status(400).json({
          error: "Either email or phoneNumber must be provided",
        });
      }

      const result = await identityService.identifyContact(email, phoneNumber);

      res.status(200).json(result);
    } catch (error) {
      console.error("Error in identify:", error);
      res.status(500).json({
        error: "Internal server error",
      });
    }
  }
}

module.exports = new IdentityController();
