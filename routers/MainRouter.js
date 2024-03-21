const express = require("express");
const AuthController = require("../controllers/AuthController");
const FriendController = require("../controllers/FriendController");
const EventController = require("../controllers/EventController");
const ExpenseController = require("../controllers/ExpenseController");
const CalculationController = require("../controllers/CalculationController");


// const { cleanUpUserData } = require("../controllers/AuthLogic");
// cleanUpUserData();
// const { cleanUpFriendData } = require("../controllers/FriendLogic");
// cleanUpFriendData();
// const { cleanUpCalculationData } = require("../controllers/CalculationLogic");
// cleanUpCalculationData();

const mainRouter = express.Router();

mainRouter.get('/ping', (req, res) => res.status(200).json("ping success"));
mainRouter.post('/auth/register', AuthController.register);
mainRouter.post('/auth/login', AuthController.login);
mainRouter.post('/auth/google-register', AuthController.googleRegister);
mainRouter.post('/auth/google-login', AuthController.googleLogin);
mainRouter.post('/auth/logout', AuthController.logout);
mainRouter.get ('/auth/refresh-token', AuthController.refreshToken);
mainRouter.post('/auth/verify-token', AuthController.verifyAccessToken);

mainRouter.post('/friend/get', AuthController.verifyAccessToken, FriendController.get);
mainRouter.post('/friend/get-flattened', AuthController.verifyAccessToken, FriendController.getFlattened);
mainRouter.post('/friend/add', AuthController.verifyAccessToken, FriendController.add);
mainRouter.post('/friend/update', AuthController.verifyAccessToken, FriendController.update);
mainRouter.post('/friend/deactivate', AuthController.verifyAccessToken, FriendController.deactivate);

mainRouter.post('/event/master-data', AuthController.verifyAccessToken, EventController.masterData);
mainRouter.post('/event/get', AuthController.verifyAccessToken, EventController.get);
mainRouter.post('/event/add', AuthController.verifyAccessToken, EventController.add);
mainRouter.post('/event/update', AuthController.verifyAccessToken, EventController.update);
mainRouter.post('/event/deactivate', AuthController.verifyAccessToken, EventController.deactivate);

mainRouter.post('/expense/master-data', AuthController.verifyAccessToken, ExpenseController.masterData);
mainRouter.post('/expense/get', AuthController.verifyAccessToken, ExpenseController.get);
mainRouter.post('/expense/add', AuthController.verifyAccessToken, ExpenseController.add);
mainRouter.post('/expense/update', AuthController.verifyAccessToken, ExpenseController.update);
mainRouter.post('/expense/deactivate', AuthController.verifyAccessToken, ExpenseController.deactivate);

mainRouter.post('/calculation/master-data', AuthController.verifyAccessToken, CalculationController.masterData);
mainRouter.post('/calculation/get', AuthController.verifyAccessToken, CalculationController.get);
mainRouter.post('/calculation/add', AuthController.verifyAccessToken, CalculationController.add);
mainRouter.post('/calculation/deactivate', AuthController.verifyAccessToken, CalculationController.deactivate);

module.exports = mainRouter;