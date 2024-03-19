require('dotenv').config();

const { getMasterData, getEvents, addEvent, updateEvent, deactivateEvent } = require("./EventLogic");

class EventController {

    static async masterData(req, res) {
        try {
            const result = await getMasterData(req.body);
            res.status(200).json(result);
            res.end();
        } catch (error) {
            console.log("FriendController.masterData(): ", error.message)
            res.status(401).json(error.message);
        };
    }

    static async get(req, res) {
        try {
            const result = await getEvents(req.body);
            res.status(200).json(result);
            res.end();
        } catch (error) {
            console.log("FriendController.get(): ", error.message)
            res.status(401).json(error.message);
        };
    }

    static async add(req, res) {
        try {
            const result = await addEvent(req.body);
            res.status(200).json(result);
            res.end();
        } catch (error) {
            console.log(error.name)
            if(error.name === "ValidationError") {
                console.log("EventController.add(): ", error.errors)
                res.status(401).json(error.errors);
            } else {
                console.log("EventController.add(): ", error.message)
                res.status(401).json(error.message);
            }
        };
    }

    static async update(req, res) {
        try {
            const result = await updateEvent(req.body);
            res.status(200).json(result);
            res.end();
        } catch (error) {
            console.log("EventController.update(): ", error.message)
            res.status(401).json(error.message);
        };
    }

    static async deactivate(req, res) {
        try {
            const result = await deactivateEvent(req.body);
            res.status(200).json(result);
            res.end();
        } catch (error) {
            console.log("EventController.deactivate(): ", error.message)
            res.status(401).json(error.message);
        };
    }
}


module.exports = EventController