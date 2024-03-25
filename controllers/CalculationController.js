require('dotenv').config();

const { getMasterData, getCalculations, addCalculation, deactivateCalculation, getSharedCalculationResult } = require("./CalculationLogic");

class CalculationController {

    static async masterData(req, res) {
        try {
            const result = await getMasterData(req.body);
            res.status(200).json(result);
            res.end();
        } catch (error) {
            console.log("CalculationController.masterData(): ", error.message)
            res.status(401).json(error.message);
        };
    }

    static async get(req, res) {
        try {
            const result = await getCalculations(req.body);
            res.status(200).json(result);
            res.end();
        } catch (error) {
            console.log("CalculationController.get(): ", error.message)
            res.status(401).json(error.message);
        };
    }

    static async getSharedResult(req, res) {
        try {
            const result = await getSharedCalculationResult(req.body);
            res.status(200).json(result);
            res.end();
        } catch (error) {
            console.log("CalculationController.getSharedResult(): ", error.message)
            res.status(401).json(error.message);
        };
    }

    static async add(req, res) {
        try {
            const result = await addCalculation(req.body);
            res.status(200).json(result);
            res.end();
        } catch (error) {
            if(error.name === "ValidationError") {
                console.log("CalculationController.add(): ", error.errors)
                res.status(401).json(error.errors);
            } else {
                console.log("CalculationController.add(): ", error.message)
                res.status(401).json(error.message);
            }
        };
    }

    static async deactivate(req, res) {
        try {
            const result = await deactivateCalculation(req.body);
            res.status(200).json(result);
            res.end();
        } catch (error) {
            console.log("CalculationController.deactivate(): ", error.message)
            res.status(401).json(error.message);
        };
    }
}


module.exports = CalculationController