const mongoose = require("mongoose");
const crypto = require("crypto");

const { SysCurrency, Calculation, Event, Expense, UserProfile, ViewFlattenedFriends }  = require("../db/mongodb/DBSchema");

const cleanUpCalculationData = async () => {
    try {
        await Calculation.deleteMany();
        console.log("All data in calculation collection deleted")
    } catch (err) {
        console.log(err);
    }
}

const getMasterData = async ({profileId}) => {
    let errorMessage;

    if(!mongoose.Types.ObjectId.isValid(profileId)) {
        errorMessage = "Invalid profile Id provided"
        throw new Error(errorMessage); 
    }

    const userProfile = await UserProfile.findOne({_id:profileId, active:true});

    if(!userProfile) {
        errorMessage = "Unable to find user profile."
        throw new Error(errorMessage);   
    }

    const currency = await SysCurrency.find({active:true},"_id value symbol exrate exrateUpdatedAt").sort({value: "asc"});

    const masterData = {currency: currency}

    return masterData;
}

const getCalculations = async ({profileId, eventId, filter={}}) => {
    let errorMessage;

    if(!mongoose.Types.ObjectId.isValid(profileId)) {
        errorMessage = "Invalid profile Id provided"
        throw new Error(errorMessage); 
    }

    const userProfile = await UserProfile.findOne({_id:profileId, active:true});

    if(!userProfile) {
        errorMessage = "Unable to find user profile."
        throw new Error(errorMessage);   
    }

    if(!mongoose.Types.ObjectId.isValid(eventId)) {
        errorMessage = "Invalid event Id provided"
        throw new Error(errorMessage); 
    }

    const event = await Event.findOne({_id:eventId, active:true});

    if(!event) {
        errorMessage = "Unable to find the event."
        throw new Error(errorMessage);   
    }

    const searchCriteria = {...{event: eventId, active:true}, ...filter};

    let calculations = await Calculation.find(searchCriteria)
                            .populate("calculationCCY","_id value symbol")
                            .populate("expensesInvolved.expense", "expenseDate expenseType")
                            .populate("expensesInvolved.expenseCCY","_id value symbol")
                            .populate("expensesInvolved.paidBy","friendId friendName")
                            .populate("expensesInvolved.costSplit.friendId","friendId friendName parentId parentName")
                            .populate("involvedCCY","_id value symbol")
                            .sort({createdAt: "desc"});

    return calculations;
}

const extendShareCodeExpiry = async ({profileId, calculationId}) => {
    if(!mongoose.Types.ObjectId.isValid(profileId) || !mongoose.Types.ObjectId.isValid(calculationId)) {
        throw new Error("Invalid profile Id or Calculation Id provided"); 
    }

    const userProfile = await UserProfile.findOne({_id:profileId, active:true});

    if(!userProfile) {
        throw new Error("Unable to find user profile.");   
    }

    const calculationData = await Calculation.findById(calculationId);

    if(!calculationData) {
        throw new Error("Unable to find calculation record.");   
    }

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 7);
    calculationData.shareCodeExpiry = expiryDate;
    if(calculationData.shareCode === undefined)
        calculationData.shareCode = crypto.randomBytes(20).toString('hex');

    calculationData.save();

    return {shareCodeExpiry:calculationData.shareCodeExpiry, shareCode:calculationData.shareCode};
}

const getSharedCalculationResult = async ({eventId, calculationId, shareCode}) => {
    if(!mongoose.Types.ObjectId.isValid(eventId) || !mongoose.Types.ObjectId.isValid(calculationId)) {
        throw new Error("Invalid event Id or calculation Id provided"); 
    }

    if(!shareCode) {
        throw new Error("Missing share code"); 
    }

    const event = await Event.findOne({_id:eventId, active:true});

    if(!event) {
        throw new Error("Unable to find the event.");   
    }

    const searchCriteria = {_id:calculationId, event: eventId, shareCode:shareCode, active:true};

    let calculationData = await Calculation.findOne(searchCriteria)
                            .populate("calculationCCY","_id value symbol")
                            .populate("expensesInvolved.expense", "expenseDate expenseType")
                            .populate("expensesInvolved.expenseCCY","_id value symbol")
                            .populate("expensesInvolved.paidBy","friendId friendName")
                            .populate("expensesInvolved.costSplit.friendId","friendId friendName parentId parentName")
                            .populate("involvedCCY","_id value symbol");
    if(calculationData) {
        if(new Date() > new Date(calculationData.shareCodeExpiry)) {
            throw new Error("Share code has expired");  
        }
        return {eventData: event, calculationData: calculationData};
    } else {
        throw new Error("Unable to find the calculation record.");  
    }
}

const doCalculation = async (calculation) => {
    // get all friends involved from expenses
    let friendsInvolved = calculation.expensesInvolved.reduce((accu, exp) => 
                                accu.concat(exp.costSplit.map((s) => s.friendId)), []); 
    friendsInvolved = [...new Set(friendsInvolved)]
    const numFriendsInvolved = friendsInvolved.length;

    // add the paidBy people to the list
    friendsInvolved = calculation.expensesInvolved.reduce((accu, exp) => 
                                accu.concat(exp.paidBy), friendsInvolved); 
    friendsInvolved = [...new Set(friendsInvolved)]

    const friends = await ViewFlattenedFriends.find({friendId:friendsInvolved}," friendId friendName isMyself parentId parentName");

    const calculationCCY = calculation.calculationCCY;
    const calculationExRate = calculation.calculationExRate;
    let expenseCCY, amtInCalculationCCY, totalAmt=0;
    let creditorList = {};
    let creditor, debtor;

    // build the creditor and debtor objects
    for(let i=0; i<calculation.expensesInvolved.length; i++) {
        expenseCCY = calculation.expensesInvolved[i].expenseCCY;
        paidBy =  friends.find((f) => f.friendId.toString() === calculation.expensesInvolved[i].paidBy)
        creditor = `${paidBy.parentName}_${paidBy.parentId}`;

        for(let j=0; j<calculation.expensesInvolved[i].costSplit.length; j++) {
            friend = friends.find((f) => f.friendId.toString() === calculation.expensesInvolved[i].costSplit[j].friendId)
            debtor = `${friend.parentName}_${friend.parentId}`;
            exRate = (expenseCCY === calculationCCY) ? 1 : calculationExRate[expenseCCY]
            amtInCalculationCCY = Number(calculation.expensesInvolved[i].costSplit[j].amount / exRate);
            totalAmt += amtInCalculationCCY;

            if(creditorList.hasOwnProperty(creditor)) {
                if(creditorList[creditor].hasOwnProperty(debtor)) {
                    creditorList[creditor][debtor] += amtInCalculationCCY;
                } else {
                    creditorList[creditor][debtor] = amtInCalculationCCY;
                }
            } else {
                creditorList[creditor] = {};
                creditorList[creditor][debtor] = amtInCalculationCCY;
            }
            // console.log("Orig:", expenseCCY, calculation.expensesInvolved[i].costSplit[j].amount);
            // console.log("Converted:", calculationCCY, amtInCalculationCCY)
        }

    }
    let calculationResult = {numFriendsInvolved:numFriendsInvolved, totalAmt:Math.round(totalAmt*100)/100};

    // Round the amount and remove zero entries
    Object.keys(creditorList).forEach((creditor) => {
        Object.keys(creditorList[creditor]).forEach((debtor) => {
            creditorList[creditor][debtor] = Math.round(creditorList[creditor][debtor] * 100) / 100;
        })
    }) 

    calculationResult = {...calculationResult, directResult:JSON.parse(JSON.stringify(creditorList))};

    // Simplify the creditor and debtor relations
    Object.keys(creditorList).forEach((creditor) => {
        Object.keys(creditorList[creditor]).forEach((debtor) => {
            if(creditor !== debtor && creditorList.hasOwnProperty(debtor) && creditorList[debtor].hasOwnProperty(creditor)) {
                if(creditorList[creditor][debtor] >= creditorList[debtor][creditor]) {
                    creditorList[creditor][debtor] = Math.round((creditorList[creditor][debtor] - creditorList[debtor][creditor]) * 100)/ 100;
                    creditorList[debtor][creditor] = 0;
                }
            } 
        })
    })
    
    // Remove zero entries
    Object.keys(creditorList).forEach((creditor) => {
        Object.keys(creditorList[creditor]).forEach((debtor) => {
            if(creditorList[creditor][debtor] === 0)
                delete creditorList[creditor][debtor];
        })
    })   

    calculationResult = {...calculationResult, simplifiedResult:JSON.parse(JSON.stringify(creditorList))};

    return calculationResult;
}

const addCalculation = async (calculation) => {
    let errorMessage;

    if(!mongoose.Types.ObjectId.isValid(calculation.event)) {
        errorMessage = "Invalid Event ID provided"
        throw new Error(errorMessage); 
    }

    const anEvent = await Event.findOne({_id:calculation.event, active:true});

    if(!anEvent) {
        errorMessage = "Unable to the Event in database."
        throw new Error(errorMessage);   
    }

    // create event record in db
    calculation["lastUpdatedAt"] = new Date();
    calculation["createdAt"] = new Date();
    calculation["shareCode"] = crypto.randomBytes(20).toString('hex');

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 7);
    calculation["shareCodeExpiry"] = expiryDate;
    
    const calculationbResult = await doCalculation(calculation);
    calculation["calculationResult"] = calculationbResult;

    const createdCalculation = await Calculation.create(calculation);

    // set the involved expenses to calculated
    const expenseIdList = calculation.expensesInvolved.map((exp) => exp.expense);

    await Expense.updateMany({_id : {$in : expenseIdList}}, {isCalculated:true})

    return createdCalculation;
}

const deactivateCalculation = async ({profileId, calculationId}) => {
    let errorMessage;

    if(!mongoose.Types.ObjectId.isValid(profileId)) {
        errorMessage = "Invalid profile Id provided"
        throw new Error(errorMessage); 
    }

    const profile = await UserProfile.findOne({_id:profileId, active:true});

    if(!profile) {
        errorMessage = "Unable to find user profile."
        throw new Error(errorMessage);   
    }
    
    try {
        // validate if event exists
        const matchedCalculation = await Calculation.findById(calculationId);

        if(!matchedCalculation) {
            errorMessage = "Calculation item cannot be found";
            throw new Error(errorMessage);          
        }

        matchedCalculation.active = false;
        matchedCalculation.lastUpdatedAt = new Date();
        matchedCalculation.save();

        return "success";
    } catch (error) {
        throw new Error("Unable to deactivate calculation: " + error.message)
    }
}

module.exports = {
    cleanUpCalculationData : cleanUpCalculationData,
    getMasterData : getMasterData,
    getCalculations : getCalculations,
    addCalculation : addCalculation,
    deactivateCalculation : deactivateCalculation,
    getSharedCalculationResult : getSharedCalculationResult,
    extendShareCodeExpiry : extendShareCodeExpiry,
}