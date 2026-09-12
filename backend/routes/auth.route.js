const express = require("express");
const auth_controller = require("../controllers/auth.controller");
const auth_middleware = require("../middlewares/auth.middleware");

module.exports = (app) => {
  app.post("/auth/login", auth_controller.login);
  app.post("/auth/register", [auth_middleware.validateToken, auth_middleware.addUserData, auth_middleware.isAdmin], auth_controller.register);
  app.put("/auth/role/change", [auth_middleware.validateToken, auth_middleware.addUserData, auth_middleware.isAdmin], auth_controller.changeRole);
  app.put("/auth/password/change", [auth_middleware.validateToken, auth_middleware.addUserData], auth_controller.changePassword);
  app.get("/auth/users", [auth_middleware.validateToken, auth_middleware.addUserData], auth_controller.getUsers);
  app.put("/auth/user/deactivate", [auth_middleware.validateToken, auth_middleware.addUserData, auth_middleware.isAdmin], auth_controller.deactivateUser);
};
