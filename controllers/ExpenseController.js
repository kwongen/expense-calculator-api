require('dotenv').config();

const { getMasterData, getExpenses, addExpense, updateExpense, deactivateExpense } = require("./ExpenseLogic");

class ExpenseController {

    static async masterData(req, res) {
        try {
            const result = await getMasterData(req.body);
            res.status(200).json(result);
            res.end();
        } catch (error) {
            console.log("ExpenseController.masterData(): ", error.message)
            res.status(401).json(error.message);
        };
    }

    static async get(req, res) {
        try {
            const result = await getExpenses(req.body);
            res.status(200).json(result);
            res.end();
        } catch (error) {
            console.log("ExpenseController.get(): ", error.message)
            res.status(401).json(error.message);
        };
    }

    static async add(req, res) {
        try {
            const result = await addExpense(req.body);
            res.status(200).json(result);
            res.end();
        } catch (error) {
            if(error.name === "ValidationError") {
                console.log("ExpenseController.add(): ", error.errors)
                res.status(401).json(error.errors);
            } else {
                console.log("ExpenseController.add(): ", error.message)
                res.status(401).json(error.message);
            }
        };
    }

    static async update(req, res) {
        try {
            const result = await updateExpense(req.body);
            res.status(200).json(result);
            res.end();
        } catch (error) {
            if(error.name === "ValidationError") {
                console.log("ExpenseController.add(): ", error.errors)
                res.status(401).json(error.errors);
            } else {
                console.log("ExpenseController.add(): ", error.message)
                res.status(401).json(error.message);
            }
        };
    }

    static async deactivate(req, res) {
        try {
            const result = await deactivateExpense(req.body);
            res.status(200).json(result);
            res.end();
        } catch (error) {
            console.log("EventController.deactivate(): ", error.message)
            res.status(401).json(error.message);
        };
    }
}


module.exports = ExpenseController