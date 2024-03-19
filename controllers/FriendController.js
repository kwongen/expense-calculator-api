require('dotenv').config();

// const { createUser, authUser, verifyToken, generateNewToken } = require("./AuthLogic");
const { getFriends, 
    getFlattenedFriends, 
    addFriends, 
    updateSingleFriend, 
    deactivateFriend } = require("./FriendLogic");

class FriendController {
    static async get(req, res) {
        try {
            const result = await getFriends(req.body);
            res.status(200).json(result);
            res.end();
        } catch (error) {
            console.log("FriendController.get(): ", error.message)
            res.status(401).json(error.message);
        };
    }
    static async getFlattened(req, res) {
        try {
            const result = await getFlattenedFriends(req.body);
            res.status(200).json(result);
            res.end();
        } catch (error) {
            console.log("FriendController.get(): ", error.message)
            res.status(401).json(error.message);
        };
    }

    // req.body = {profileId: id, friends: [{name: name, email: email, members:[{name, email}]}]}
    static async add(req, res) {
        try {
            const result = await addFriends(req.body);
            res.status(200).json(result);
            res.end();
        } catch (error) {
            console.log("FriendController.add(): ", error.message)
            res.status(401).json(error.message);
        };
    }

    // req.body = {profileId: id, 
    //             friends:[{_id: id, 
    //                     isMyself: true|false 
    //                     name:name, 
    //                     email:emai, 
    //                     active:true|false, 
    //                     members:[{_id:id, name:name, email:email, active:true|false}...] }]} 
    static async update(req, res) {
        try {
            const result = await updateSingleFriend(req.body);
            res.status(200).json(result);
            res.end();
        } catch (error) {
            console.log("FriendController.update(): ", error.message)
            res.status(401).json(error.message);
        };
    }

    static async deactivate(req, res) {
        try {
            const result = await deactivateFriend(req.body);
            res.status(200).json(result);
            res.end();
        } catch (error) {
            console.log("FriendController.deactivate(): ", error.message)
            res.status(401).json(error.message);
        };
    }

}


module.exports = FriendController