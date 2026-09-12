// Dependencies
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const logger = require("../logger");
const { recordAudit } = require("../utils/audit");

// Database models
const user_model = require("../models/user.model");
const { log } = require("winston");

// Configurations
require("dotenv").config();

const SALT_ROUNDS = 10;

// Register controller
const register = async (req, res) => {
  if (!req.body) {
    return res.status(400).send({ error: "Empty Request Body" });
  }

  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).send({ error: "Name, email, and password are required." });
  }

  if (password.length < 8) {
    return res.status(400).send({ error: "Password must be at least 8 characters long." });
  }

  try {
    const existing = await user_model.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).send({ error: "An account with this email already exists." });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await user_model.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
    });

    logger.info(`AUTH | REGISTER | New user registered: ${user.email}`);
    await recordAudit({ action: "CREATE", entityType: "USER", entityId: user._id, performedBy: req.user?._id, changes: [
      { attribute: "name", newValue: user.name },
      { attribute: "email", newValue: user.email },
      { attribute: "user_type", newValue: user.user_type },
    ] });
    return res.status(201).send({ user_type: user.user_type, name: user.name, email: user.email });
  } catch (err) {
    logger.error(`AUTH | REGISTER | Failed to register user: ${err}`);
    return res.status(500).send({ error: "Registration failed. Please try again." });
  }
};

// Login controller
const login = async (req, res) => {
  if (!req.body) {
    return res.status(400).send({ error: "Empty Request Body" });
  }

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).send({ error: "Email and password are required." });
  }

  try {
    const user = await user_model.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).send({ error: "Invalid email or password." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).send({ error: "Invalid email or password." });
    }

    const token = jwt.sign({ sub: user._id, user_type: user.user_type, name: user.name, email: user.email }, process.env.JWT_SECRET, { expiresIn: "1d" });

    logger.info(`AUTH | LOGIN | User logged in: ${user.email}`);
    return res.status(200).send({ token, user_type: user.user_type, name: user.name, email: user.email });
  } catch (err) {
    logger.error(`AUTH | LOGIN | Failed to log in user: ${err}`);
    return res.status(500).send({ error: "Login failed. Please try again." });
  }
};

// Role change controller
const changeRole = async (req, res) => {
  if (!req.body) {
    return res.status(400).send({ error: "Empty Request Body" });
  }

  const { email, role } = req.body;

  if (!email || !role) {
    return res.status(400).send({ error: "Email and Role are required." });
  }

  if (role !== "ADMIN") {
    return res.status(400).send({ error: "Role change not allowed" });
  }

  try {
    const user = await user_model.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(400).send({ error: "No user exists in the system with the provided email." });
    }

    if (user.user_type !== "USER") {
      return res.status(400).send({ error: "Role change not allowed for this user." });
    }

    const updatedUser = await user_model.findOneAndUpdate({ email: email.toLowerCase().trim() }, { $set: { user_type: "ADMIN" } }, { new: true });

    logger.info(`AUTH | ROLE CHANGE | User role updated: ${user.email}`);
    await recordAudit({ action: "UPDATE", entityType: "USER", entityId: updatedUser._id, performedBy: req.user?._id, changes: [
      { attribute: "user_type", oldValue: user.user_type, newValue: updatedUser.user_type },
    ] });
    const safeUser = {
      name: updatedUser.name,
      email: updatedUser.email,
      user_type: updatedUser.user_type,
      created_at: updatedUser.created_at,
      updated_at: updatedUser.updated_at,
    };

    return res.status(200).send({ user: safeUser });
  } catch (err) {
    logger.error(`AUTH | ROLE CHANGE | Failed to change role for user: ${err}`);
    return res.status(500).send({ error: "Role Change failed. Please try again." });
  }
};

// Password Change controller
const changePassword = async (req, res) => {
  if (!req.body) {
    return res.status(400).send({ error: "Empty Request Body" });
  }

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).send({ error: "Email and Password are required." });
  }

  try {
    const user = await user_model.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(400).send({ error: "No user exists in the system with the provided email." });
    }

    if (user.user_type === "SYSTEM_ADMIN") {
      return res.status(403).send({ error: "Password change not allowed for this role" });
    }

    if (req.user.user_type === "ADMIN" && user.user_type === "ADMIN" && user.email !== req.user.email) {
      return res.status(403).send({ error: "You are not authorized to change password for another ADMIN" });
    }

    if (req.user.user_type === "USER" && user.email !== req.user.email) {
      return res.status(403).send({ error: "You are not authorized to change password for another USER" });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const updatedUser = await user_model.findOneAndUpdate(
      { email: email.toLowerCase().trim() },
      { $set: { password: hashedPassword } },
      { new: true }
    );

    if (!updatedUser) {
      logger.error(`AUTH | PASSWORD CHANGE | Failed to update password for user: ${user.email}`);
      return res.status(500).send({ error: "Password change failed. Please try again." });
    }

    logger.info(`AUTH | PASSWORD CHANGE | User password updated: ${user.email}`);
    await recordAudit({ action: "UPDATE", entityType: "USER", entityId: user._id, performedBy: req.user?._id, changes: [
      { attribute: "password", oldValue: "[REDACTED]", newValue: "[REDACTED]" },
    ] });
    return res.status(200).send({ message: "Password changed successfully." });
  } catch (err) {
    logger.error(`AUTH | PASSWORD CHANGE | Failed to change password for user: ${err}`);
    return res.status(500).send({ error: "Password change failed. Please try again." });
  }
};

// Get all users controller (active and inactive, filtered by hierarchy)
const getUsers = async (req, res) => {
  try {
    const requestingUser = req.user;
    const includeSelf = String(req.query.include_self || "").toLowerCase() === "true";
    const roleHierarchy = { SYSTEM_ADMIN: 3, ADMIN: 2, USER: 1 };
    const requestingUserLevel = roleHierarchy[requestingUser.user_type] || 0;

    const allowedRoles = Object.entries(roleHierarchy)
      .filter(([, level]) => level <= requestingUserLevel)
      .map(([role]) => role);
    if (!allowedRoles.length) {
      return res.status(403).send({ error: "You are not authorized to access this endpoint." });
    }

    // Include the requester so monitoring can show their own audit activity.
    const userFilter = { user_type: { $in: allowedRoles } };
    if (!includeSelf) userFilter._id = { $ne: requestingUser._id };
    const users = await user_model
      .find(userFilter)
      .select("-password")
      .sort({ created_at: -1 });

    const formatISTDate = (date) => {
      if (!date) return "-";
      const sourceDate = new Date(date);
      if (Number.isNaN(sourceDate.getTime())) return "-";
      const istDate = new Date(sourceDate.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }));
      const dateStr = istDate.toLocaleDateString("en-IN");
      const hours = String(istDate.getHours()).padStart(2, "0");
      const minutes = String(istDate.getMinutes()).padStart(2, "0");
      const seconds = String(istDate.getSeconds()).padStart(2, "0");
      const timeStr = `${hours}:${minutes}:${seconds}`;
      return `${dateStr} ${timeStr}`;
    };

    const formattedUsers = users.map((user) => ({
      id: user._id,
      name: user.name,
      email: user.email,
      user_type: user.user_type,
      is_active: user.is_active,
      created_at: formatISTDate(user.created_at),
      updated_at: formatISTDate(user.updated_at),
    }));

    return res.status(200).send({ users: formattedUsers });
  } catch (err) {
    logger.error(`AUTH | GET USERS | Failed to fetch users: ${err}`);
    return res.status(500).send({ error: "Failed to fetch users. Please try again." });
  }
};

// Deactivate user controller
const deactivateUser = async (req, res) => {
  if (!req.body) {
    return res.status(400).send({ error: "Empty Request Body" });
  }

  const { email } = req.body;

  if (!email) {
    return res.status(400).send({ error: "Email is required." });
  }

  try {
    const user = await user_model.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(400).send({ error: "No user exists in the system with the provided email." });
    }

    if (user.user_type === "SYSTEM_ADMIN") {
      return res.status(403).send({ error: "Cannot deactivate SYSTEM_ADMIN account." });
    }

    const updatedUser = await user_model.findOneAndUpdate(
      { email: email.toLowerCase().trim() },
      { $set: { is_active: false } },
      { new: true }
    );

    if (!updatedUser) {
      logger.error(`AUTH | DEACTIVATE USER | Failed to deactivate user: ${user.email}`);
      return res.status(500).send({ error: "User deactivation failed. Please try again." });
    }

    logger.info(`AUTH | DEACTIVATE USER | User deactivated: ${user.email}`);
    await recordAudit({ action: "DELETE", entityType: "USER", entityId: updatedUser._id, performedBy: req.user?._id, changes: [
      { attribute: "is_active", oldValue: true, newValue: false },
    ] });
    return res.status(200).send({ message: "User deactivated successfully." });
  } catch (err) {
    logger.error(`AUTH | DEACTIVATE USER | Failed to deactivate user: ${err}`);
    return res.status(500).send({ error: "User deactivation failed. Please try again." });
  }
};

module.exports = { register, login, changeRole, changePassword, getUsers, deactivateUser };
