require('dotenv').config()

const mongoose = require("mongoose");

const { UserProfile, UserLogin, Friend }  = require("../db/mongodb/DBSchema");

const { profileSchema, changePasswordSchema } = require("../util/validationSchema");
const Token = require("../util/Token");

const editProfile = async (profileData) => {
    await profileSchema.validate(profileData, { abortEarly: false })
    .then (async () => {
        let errorMessage;

        const profile = await UserProfile.findOne( {_id: profileData.profileId, active: true} );
        if(!profile) {
            errorMessage = "This user profile does not exist";
            throw new Error(errorMessage);   
        }

        const login = await UserLogin.findOne( {profile : profileData.profileId, active: true} );
        if(!login) {
            errorMessage = "This user login does not exist";
            throw new Error(errorMessage);   
        }

        const friend = await Friend.findOne( {_id : profile.myFriendId, active: true} );
        if(!friend) {
            errorMessage = "Your corresponding friend record is missing";
            throw new Error(errorMessage);   
        }
       
        const duplicatedEmail = await UserProfile.findOne( {_id: {$ne: profileData.profileId}, email: profileData.email, active: true} );
        if(duplicatedEmail) {
            errorMessage = "Your new email address already exists";
            throw new Error(errorMessage);   
        }

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const updateDate = new Date();
            profile.name = profileData.name;
            profile.paymentLinkTemplate = profileData.paymentLinkTemplate;
            profile.bankAccountInfo = profileData.bankAccountInfo;

            if(profile.email !== profileData.email) {
                profile.email = profileData.email;
                login.email = profileData.email;
                friend.email = profileData.email;

                login.lastUpdatedAt = updateDate;
                login.save()

                friend.lastUpdatedAt = updateDate;
                friend.save()
            }

            profile.lastUpdatedAt = updateDate;
            profile.save()
            await session.commitTransaction(); 
        } catch (error) {
            // If an error occurred, abort the whole transaction and
            // undo any changes that might have happened      
            await session.abortTransaction();
            errorMessage = "Rollback transaction due to " + error.message;
            throw new Error(errorMessage);
        } finally {
            await session.endSession();        
        }
    })
    .catch(async (err) => {       
        //console.log("err name:", err.name)
        //console.log("validation failed", err)
        if(err.name === "ValidationError")
            throw new Error(JSON.stringify({message: "Invalid information provided", errors: err.errors})); 
        else 
            throw new Error(JSON.stringify({message: err.message}));  
    })

    return "success";
}

const changePassword = async (changePasswordData) => {
    await changePasswordSchema.validate(changePasswordData, { abortEarly: false })
    .then (async () => {
        const login = await UserLogin.findOne( {_id: changePasswordData.loginId, active: true} );
        if(!login) {
            throw new Error("This user login does not exist");   
        }

        const isCorrectPwd = await login.matchPassword(changePasswordData.currentPassword);

        if(!isCorrectPwd) {
            throw new Error("Current password is not correct.");  
        }

        login.hashedPassword = changePasswordData.newPassword;
        login.lastUpdatedAt = new Date();
        login.save()
    })
    .catch(async (err) => {       
        if(err.name === "ValidationError")
            throw new Error(JSON.stringify({message: "Invalid information provided", errors: err.errors})); 
        else 
            throw new Error(JSON.stringify({message: err.message}));  
    })

    return "success";
}

module.exports = {
    editProfile : editProfile, changePassword : changePassword,
}