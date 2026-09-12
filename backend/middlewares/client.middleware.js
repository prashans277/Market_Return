const authMiddleware = require("./auth.middleware");

const clientMiddleware = {
  validateToken: authMiddleware.validateToken,
  addUserData: authMiddleware.addUserData,
};

module.exports = clientMiddleware;
