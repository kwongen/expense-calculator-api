const mongoose = require("mongoose");

const { SysMaster, SysCurrency, Event, Expense, UserProfile }  = require("../db/mongodb/DBSchema");

const { expenseSchema } = require("../util/validationSchema");

const cleanUpExpenseData = async () => {
    try {
        await Expense.deleteMany();
        console.log("All data in expense collection deleted")
    } catch (err) {
        console.log(err);
    }
}

const validateExpense = async (expense) => {
    // validate expense data
    await expenseSchema
        .validate(expense, { abortEarly: false })
        .catch((error) => {
            throw error;
        });
    return "success"
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

    const expenseType = await SysMaster.find({type:"expense_type", active:true},"_id value").sort({value: "asc"});
    const currency = await SysCurrency.find({active:true},"_id value symbol").sort({value: "asc"});

    const masterData = {expenseType: expenseType,
                        currency: currency}

    return masterData;
}

const getExpenses = async ({profileId, eventId, filter={}}) => {
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

    let expenses = await Expense.find(searchCriteria)
                            .populate("expenseType","_id value")
                            .populate("expenseCCY", "_id value symbol")
                            .populate("whoInvolved","friendId friendName isMyself parentId parentName")
                            .populate("paidBy","friendId friendName isMyself parentId parentName")
                            .sort({expenseDate: "desc", expenseType:"asc"});

    return expenses;
}

// Input:
// {
//     "event": "65df9d45b0a64ed86f5ffa06",
//     "expenseType": "Booking",
//     "expenseDesc": "Badminton court booking",   
//     "expenseCCY":  "GBP",
//     "expenseAmt": "28",    
//     "expenseDate": "2024-02-28",
//     "whoPaid": "65dcb24606a62c0844d445af",
//     "whoInvolved": ["65dcb24606a62c0844d445af","65dcb24606a62c0844d445a9"]
// }
const addExpense = async (expense) => {
    let errorMessage;

    if(!mongoose.Types.ObjectId.isValid(expense.event)) {
        errorMessage = "Invalid Event ID provided"
        throw new Error(errorMessage); 
    }

    const anEvent = await Event.findOne({_id:expense.event, active:true});

    if(!anEvent) {
        errorMessage = "Unable to the Event in database."
        throw new Error(errorMessage);   
    }
    
    // validate inputted event data
    expense.expenseDesc = expense.expenseDesc.trim();
    await validateExpense(expense);

    // create event record in db
    const createdExpense = await Expense.create(expense);

    const lastestExpense = await Expense.find({event:anEvent._id, active:true},"_id expenseDate")
                                        .sort({expenseDate: "desc", expenseType:"asc"})
                                        .limit(5);

    const lastestExpenseIds = lastestExpense.map((exp) => exp._id);

    anEvent.lastActivityAt = lastestExpense[0].expenseDate;
    anEvent.lastestExpenses = lastestExpenseIds;
    anEvent.save();

    return createdExpense;
}

// Input:
// {
//     "_id" : "65df9d45b0a64ed86f5ffa06"
//     "event": "65df9d45b0a64ed86f5ffa06",
//     "expenseType": "Booking",
//     "expenseDesc": "Badminton court booking",   
//     "expenseCCY":  "GBP",
//     "expenseAmt": "28",    
//     "expenseDate": "2024-02-28",
//     "whoPaid": "65dcb24606a62c0844d445af",
//     "whoInvovled": ["65dcb24606a62c0844d445af","65dcb24606a62c0844d445a9"]
// }
const updateExpense = async (expense) => {
    let errorMessage;

    if(!mongoose.Types.ObjectId.isValid(expense.event)) {
        errorMessage = "Invalid Event ID provided"
        throw new Error(errorMessage); 
    }

    const anEvent = await Event.findOne({_id:expense.event, active:true});

    if(!anEvent) {
        errorMessage = "Unable to the Event in database."
        throw new Error(errorMessage);   
    }
    
    // validate inputted event data
    expense.expenseDesc = expense.expenseDesc.trim();
    await validateExpense(expense);

    // validate if expense exists
    const matchedExpense = await Expense.findById(expense._id);

    if(!matchedExpense) {
        errorMessage = `Expense "${expense.expenseType}" on ${expenseDate.slice(0,10)} cannot be found`;
        throw new Error(errorMessage);
    }

    // update expense record to db
    expense.lastUpdatedAt = new Date();
    const updatedResult = await matchedExpense.updateOne(expense);
    
    if(updatedResult.modifiedCount === 0) {
        errorMessage = `Failed to update the expense`;
        throw new Error(errorMessage);         
    }

    const updatedExpense = await Expense.findById(expense._id);

    const lastestExpense = await Expense.find({event:anEvent._id, active:true},"_id expenseDate")
                                        .sort({expenseDate: "desc", expenseType:"asc"})
                                        .limit(5);

    const lastestExpenseIds = lastestExpense.map((exp) => exp._id);

    anEvent.lastActivityAt = lastestExpense[0].expenseDate;
    anEvent.lastestExpenses = lastestExpenseIds;
    anEvent.save();

    return updatedExpense;
}

const deactivateExpense = async ({profileId, expenseId}) => {
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
        const matchedExpense = await Expense.findById(expenseId);

        if(!matchedExpense) {
            errorMessage = `Expense item cannot be found`;
            throw new Error(errorMessage);          
        }

        matchedExpense.active = false;
        matchedExpense.lastUpdatedAt = new Date();
        matchedExpense.save();

        return "success";
    } catch (error) {
        console.log(error.message)
        throw new Error("Unable to deactivate expense: " + error.message)
    }
}

module.exports = {
    cleanUpExpenseData : cleanUpExpenseData,
    getMasterData : getMasterData,
    getExpenses : getExpenses,
    addExpense : addExpense,
    updateExpense : updateExpense,
    deactivateExpense : deactivateExpense,
}