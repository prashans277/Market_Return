const monitoring_controller = require("../controllers/monitoring.controller");
const auth_middleware = require("../middlewares/auth.middleware");

module.exports = (app) => {
  app.get("/monitoring/audits", [auth_middleware.validateToken, auth_middleware.addUserData], monitoring_controller.getUserAudits);
};
