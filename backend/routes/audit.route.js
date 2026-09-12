const audit_controller = require("../controllers/audit.controller");
const auth_middleware = require("../middlewares/auth.middleware");

module.exports = (app) => {
  app.get("/clients/:clientId/audits", [auth_middleware.validateToken, auth_middleware.addUserData], audit_controller.getClientAudits);
};