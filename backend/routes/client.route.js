const client_controller = require("../controllers/client.controller");
const auth_middleware = require("../middlewares/auth.middleware");

module.exports = (app) => {
  app.post("/clients", [auth_middleware.validateToken, auth_middleware.addUserData], client_controller.createClient);
  app.get("/clients", [auth_middleware.validateToken, auth_middleware.addUserData], client_controller.getClients);
  app.get("/clients/:clientId", [auth_middleware.validateToken, auth_middleware.addUserData], client_controller.getClient);
  app.put("/clients/:clientId", [auth_middleware.validateToken, auth_middleware.addUserData], client_controller.updateClient);
  app.post("/clients/:clientId/calls", [auth_middleware.validateToken, auth_middleware.addUserData], client_controller.addCall);
  app.put("/clients/:clientId/calls/:callId", [auth_middleware.validateToken, auth_middleware.addUserData], client_controller.updateCall);
};
