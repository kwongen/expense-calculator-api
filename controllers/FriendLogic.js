const mongoose = require("mongoose");

const { ViewFlattenedFriends, Friend, UserProfile }  = require("../db/mongodb/DBSchema");

const { friendSchema } = require("../util/validationSchema");

const trimNameAndEmail= (friends) => {
    return friends.map((item) => {
            item.name=item.name.trim();
            item.email=item?.email?.trim?.();
            if(item.members && Array.isArray(item.members)) {
                item.members = item.members.map((member) => {
                    member.name = member.name.trim();
                    member.email=member?.email?.trim?.();
                    return member;
                })
            }
            return item;
        })
}

const getAllNamesWithoutDuplicate = (friends) => {
    // check if any duplicated friend names from input
    const allNames = friends.map((item) => item.name.toLowerCase());
    const filteredNames = Array.from(new Set(allNames));
    
    if(allNames.length !== filteredNames.length) {
        errorMessage = "Some of your friends' name are duplicated."
        throw new Error(errorMessage);   
    }

    return allNames;
}

const getAllNamesIncMemberWithoutDuplicate = (friends) => {
    const allNames = friends.reduce((accumulator, item) => {
                accumulator.push(item.name?.toLowerCase());
                if(item.members !== undefined && item.members.length>0) {
                    accumulator = accumulator.concat(item.members.map((row) => row["name"]?.toLowerCase()));
                }
                return accumulator;
            }, []);

    const filteredNames = Array.from(new Set(allNames));

    if(allNames.length !== filteredNames.length) {
        errorMessage = "Some of your friends' name are duplicated."
        throw new Error(errorMessage);   
    }

    return allNames;
}

const cleanUpFriendData = async () => {
    try {
        await Friend.deleteMany();
        console.log("All data in friend collection deleted")
    } catch (err) {
        console.log(err);
    }
}

const validateFriends = async (friends) => {
    // validate friend data
    let result;
    for(let i=0; i<friends.length; i++) {
        result = await friendSchema
                    .validate(friends[i], { abortEarly: false })
                    .catch((error) => {
                        //console.log("yup error", error.message, i)
                        return error;
                    });
        
        // throw error when got validation error
        if(result instanceof Error) {
            throw new Error(result.message); 
        }
    }

    return "success"
}

const getFlattenedFriends = async ({profileId}) => {
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

    const friends = await ViewFlattenedFriends.find({userProfile: profileId});

    return friends;
}

const getFriends = async ({profileId}) => {
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

    let friends = await Friend.find({userProfile: profileId, active:true}
                                    ).sort({isMyself: -1, name: 1});

    // sort member's name and remove inactive members
    friends = friends.map((item) => {
        item.members = item.members.filter((item) => item.active);
        item.members.sort((a,b) => a.name.localeCompare(b.name));       
        return item;
    })

    return friends;
}

// Input:
// {profileId: id, friends: [{name: name, email: email, members:[{name, email}]}]}
const addFriends = async ({profileId, friends}) => {
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
    
    // trim name and email from the input data
    friends = trimNameAndEmail(friends);

    const allNames = getAllNamesWithoutDuplicate(friends);

    // validate inputted friend data
    await validateFriends(friends);

    // validate friends name against database records
    const regExpAr = allNames.map((item) => new RegExp(`^${item}$`,"i"));
    const matchedFriends = await Friend.find( {name: {$in : regExpAr}, userProfile: profileId, active: true }, "name" ).exec();

    if(Array.isArray(matchedFriends) && matchedFriends.length>0) {
        const matchedNames = matchedFriends.map((item) => item.name).join();
        errorMessage = `Friends' name "${matchedNames}" already exists`;
        throw new Error(errorMessage);   
    }

    // prepare the array for db record creation
    let friendAr = [];
    for(let i=0; i<friends.length; i++) {      
        const friendObj = {
            userProfile: profileId,
            isMyself: friends[i]?.isMyself,
            name: friends[i].name,        
            email: friends[i]?.email,
            members: friends[i].members
        }

        friendAr.push(friendObj);
    }

    // create friend records in db
    const createdFriends = await Friend.create(friendAr);

    return createdFriends;
}

const updateMutlipleFriends = async ({profileId, friends}) => {
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

    // trim name and email from the input data
    friends = trimNameAndEmail(friends);

    const allNames = getAllNamesWithoutDuplicate(friends);

    // validate inputted friend data
    await validateFriends(friends);

    // validate friends name against database records
    const regExpAr = allNames.map((item) => new RegExp(`^${item}`,"i"));
    const friendIdsToUpdate = friends.map((item) => item._id);
    const matchedFriends = await Friend.find( {name: {$in : regExpAr}, _id: {$nin: friendIdsToUpdate}, active: true }, "name" ).exec();

    if(Array.isArray(matchedFriends) && matchedFriends.length>0) {
        const matchedNames = matchedFriends.map((item) => item.name).join();
        errorMessage = `Friends' name "${matchedNames}" already exists`;
        throw new Error(errorMessage);   
    }

    // Update database
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        for(let i=0; i<friends.length; i++) {
            friends[i].lastUpdatedAt = new Date();
            await Friend.findByIdAndUpdate(friends[i]._id, friends[i]);
        }
        await session.commitTransaction(); 
    } catch (error) {
        await session.abortTransaction(); 
        throw new Error("Unable to save data to database: ", error.message)
    } finally {
        await session.endSession();
    }

    const updatedFriends = await Friend.find( { _id: {$in: friendIdsToUpdate}});

    return updatedFriends;
}

const updateSingleFriend = async ({profileId, friend}) => {
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

    // trim name and email from the input data
    [friend] = trimNameAndEmail([friend]);

    // validate inputted friend data
    await validateFriends([friend]);

    // validate friends name against database records
    const regExp =  new RegExp(`^${friend.name}$`,"i");
    const matchedFriends = await Friend.find( {name: {$in : regExp}, _id: {$nin: friend._id}, active: true }, "name" ).exec();

    if(Array.isArray(matchedFriends) && matchedFriends.length>0) {
        const matchedNames = matchedFriends.map((item) => item.name).join();
        errorMessage = `Friends' name "${matchedNames}" already exists`;
        throw new Error(errorMessage);   
    }

    // Update database
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const friendRec = await Friend.findById(friend._id);
        let memberFound;

        friendRec.name = friend.name;
        friendRec.email = friend.email;
        friendRec.active = friend.active;
        friendRec.lastUpdatedAt = new Date();
        friend.members.forEach((member) => {
            if(member._id) {
                friendRec.members.id(member._id).name=member.name;
                friendRec.members.id(member._id).email=member.email;
                friendRec.members.id(member._id).active=member.active;
            } else {
                memberFound = friendRec.members.find((m) => m.name===member.name)
                if(memberFound) {
                    memberFound.email = member.email;
                    memberFound.active = member.active;
                } else {
                    friendRec.members.push(member);
                }
            }
        });
        friendRec.save();

        await session.commitTransaction(); 
    } catch (error) {
        await session.abortTransaction(); 
        throw new Error("Unable to save data to database: ", error.message)
    } finally {
        await session.endSession();
    }

    const updatedFriend = await Friend.find( { _id: {$in: friend._id}});

    return updatedFriend;
}

const deactivateFriend = async ({profileId, friendId}) => {
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

    try {
        const friendRec = await Friend.findById(friendId,);
        
        if(!friendRec) {
            throw new Error("This friend does not exist.")
        }

        if(!friendRec.name.includes("(deleted)"))
            friendRec.name = friendRec.name + " (deleted)";
        friendRec.active = false;
        friendRec.lastUpdatedAt = new Date();
        friendRec.save();

        return "success";
    } catch (error) {
        console.log(error.message)
        throw new Error("Unable to deactivate friend: " + error.message)
    }
}

module.exports = {
    cleanUpFriendData : cleanUpFriendData,
    getFriends : getFriends,
    getFlattenedFriends : getFlattenedFriends,
    addFriends : addFriends,
    updateMutlipleFriends : updateMutlipleFriends,
    updateSingleFriend : updateSingleFriend,
    deactivateFriend : deactivateFriend
}