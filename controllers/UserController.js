require('dotenv').config();

const { editProfile } = require("./UserLogic");

class UserController {
    static async editProfile(req, res) {
        try {
            const result = await editProfile(req.body);
            res.status(200).json(result);
            res.end();
        } catch (error) {
            res.set('Content-Type', 'application/json')
            if(error.name === "ValidationError") {
                console.log("UserController.editProfile(): ", error.errors)
                res.status(401).send(error.errors);
            } else {
                console.log("UserController.editProfile(): ", error.message)
                res.status(401).send(error.message);
            }
        };
    }
}


module.exports = UserController