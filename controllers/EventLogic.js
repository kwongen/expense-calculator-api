const mongoose = require("mongoose");

const { SysMaster, SysCurrency, Event, UserProfile }  = require("../db/mongodb/DBSchema");

const { eventSchema } = require("../util/validationSchema");

const cleanUpEventData = async () => {
    try {
        await Event.deleteMany();
        console.log("All data in event collection deleted")
    } catch (err) {
        console.log(err);
    }
}

const validateEvent = async (anEvent) => {
    // validate event data
    await eventSchema
        .validate(anEvent, { abortEarly: false })
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

    const eventNature = await SysMaster.find({type:"event_nature", active:true},"_id value").sort({value: "asc"});
    const eventFrequency = await SysMaster.find({type:"event_freq", active:true},"_id value").sort({value: "asc"});
    const currency = await SysCurrency.find({active:true},"_id value symbol").sort({value: "asc"});

    const masterData = {eventNature: eventNature,
                        eventFrequency: eventFrequency,
                        currency: currency}

    return masterData;
}

const getEvents = async ({profileId, filter={}}) => {
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

    const searchCriteria = {...{userProfile: profileId, active:true}, ...filter};

    let events = await Event.find(searchCriteria)
                            .populate("eventNature", "_id value")
                            .populate("eventFrequency", "_id value")
                            .populate("expenseDefaultCCY", "_id value symbol")
                            .populate("friendsInvolved", "_id friendId friendName isMyself parentId parentName totalMembers")
                            .populate("lastestExpenses")
                            .sort({lastActivityAt: -1, lastUpdatedAt: -1, eventName: 1});

    return events;
}



// Input:
// { 
//     userProfile: "profileId",
//     eventName: "eventName",   
//     eventDesc:  "eventDesc",    
//     eventNature: "travel | leisure | activity | lunch | dinner",
//     eventFrequency: "one-time | every week | every month",
//     eventStartDate: "date",
//     eventEndDate: "date", 
//     expenseDefaultCCY: "GBP | HKD | YEN",
//     friendsInvolved: ["friendId"...],
//     excludeMembers: ["memberId" ...]
//     active: ture | false
// }
const addEvent = async (anEvent) => {
    let errorMessage;

    if(!mongoose.Types.ObjectId.isValid(anEvent.userProfile)) {
        errorMessage = "Invalid profile Id provided"
        throw new Error(errorMessage); 
    }

    const profile = await UserProfile.findOne({_id:anEvent.userProfile, active:true});

    if(!profile) {
        errorMessage = "Unable to find user profile."
        throw new Error(errorMessage);   
    }
    
    // validate inputted event data
    anEvent.eventName = anEvent.eventName.trim();
    anEvent.eventDesc = anEvent.eventDesc.trim();
    await validateEvent(anEvent);

    // validate no duplicated event name
    const exp = new RegExp(`^${anEvent.eventName}$`,"i")
    const matchedEvent = await Event.findOne( {eventName: {$in : exp}, active: true }, "eventName" ).exec();

    if(matchedEvent) {
        errorMessage = `Event name "${anEvent.eventName}" already exists`;
        throw new Error(errorMessage);   
    }

    // create event record in db
    const createdEvent = await Event.create(anEvent);

    return createdEvent;
}

// Input:
// { 
//     _id: "eventId"
//     userProfile: "profileId",
//     eventName: "eventName",   
//     eventDesc:  "eventDesc",    
//     eventNature: "travel | leisure | activity | lunch | dinner",
//     eventFrequency: "one-time | every week | every month",
//     eventStartDate: "date",
//     eventEndDate: "date", 
//     expenseDefaultCCY: "GBP | HKD | YEN",
//     friendsInvolved: ["friendId"...],
//     excludeMembers: ["memberId" ...]
//     active: ture | false
// }
const updateEvent = async (anEvent) => {
    let errorMessage;

    if(!mongoose.Types.ObjectId.isValid(anEvent.userProfile)) {
        errorMessage = "Invalid profile Id provided"
        throw new Error(errorMessage); 
    }

    const profile = await UserProfile.findOne({_id:anEvent.userProfile, active:true});

    if(!profile) {
        errorMessage = "Unable to find user profile."
        throw new Error(errorMessage);   
    }
    
    // validate inputted event data
    anEvent.eventName = anEvent.eventName.trim();
    anEvent.eventDesc = anEvent.eventDesc.trim();
    await validateEvent(anEvent);

    // validate if event exists

    const matchedEvent = await Event.findById(anEvent._id);

    if(!matchedEvent) {
        errorMessage = `Event name "${anEvent.eventName}" cannot be found`;
        throw new Error(errorMessage);          
    }

    // validate no duplicated event name
    const exp = new RegExp(`^${anEvent.eventName}$`,"i")
    const duplicatedEvent = await Event.findOne( {eventName: {$in : exp}, _id: {$nin: anEvent._id}, active: true }, "eventName" ).exec();

    if(duplicatedEvent) {
        errorMessage = `Event name "${anEvent.eventName}" already exists`;
        throw new Error(errorMessage);   
    }

    // update event record to db
    anEvent.lastUpdatedAt = new Date();
    const updatedResult = await matchedEvent.updateOne(anEvent);
 
    if(updatedResult.modifiedCount === 0) {
        errorMessage = `Failed to update the event`;
        throw new Error(errorMessage);         
    }

    if(!anEvent.eventStartDate)
        matchedEvent.eventStartDate = undefined;

    if(!anEvent.eventEndDate)
        matchedEvent.eventEndDate = undefined;
    
    matchedEvent.save();

    const updatedEvent = await Event.findById(anEvent._id);

    return updatedEvent;
}

const deactivateEvent = async ({profileId, eventId}) => {
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
        const matchedEvent = await Event.findById(eventId);

        if(!matchedEvent) {
            errorMessage = `Event cannot be found`;
            throw new Error(errorMessage);          
        }

        if(!matchedEvent.eventName.includes("(deleted)"))
            matchedEvent.eventName = matchedEvent.eventName + " (deleted)";

        matchedEvent.active = false;
        matchedEvent.lastUpdatedAt = new Date();
        matchedEvent.save();

        return "success";
    } catch (error) {
        console.log(error.message)
        throw new Error("Unable to deactivate event: " + error.message)
    }
}

module.exports = {
    cleanUpEventData : cleanUpEventData,
    getMasterData : getMasterData,
    getEvents : getEvents,
    addEvent : addEvent,
    updateEvent : updateEvent,
    deactivateEvent : deactivateEvent,
}