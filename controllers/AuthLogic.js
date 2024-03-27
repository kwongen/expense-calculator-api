require('dotenv').config()

const mongoose = require("mongoose");

const { UserProfile, UserLogin, Friend }  = require("../db/mongodb/DBSchema");

const { registerSchema, loginSchema } = require("../util/validationSchema");
const Token = require("../util/Token");

const cleanUpUserData = async () => {
    try {
        await UserLogin.deleteMany();
        await UserProfile.deleteMany();
        console.log("All data in user_login and user_profile colelctions deleted")
    } catch (err) {
        console.log(err);
    }
}

const createUserInDB = async (name, email, password, type="local") => {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
        const options = { session, new: true };

        const newUserProfile = await UserProfile.create([{
            name: name,
            email: email,
            createdAt: new Date(),
            lastUpdatedAt: new Date()
        }], options);

        await newUserProfile[0].save();

        const newUserLogin = await UserLogin.create([{
            email: email,
            hashedPassword: password,
            type: type,
            lastAccess: new Date(),
            createdAt: new Date(),
            lastUpdatedAt: new Date(),
            profile: newUserProfile[0]._id
        }], options);

        await newUserLogin[0].save();

        const friend = await Friend.create([{
            userProfile: newUserProfile[0]._id,
            isMyself: true,
            name: newUserProfile[0].name,        
            email: newUserProfile[0].email
        }], options);

        await friend[0].save();

        newUserProfile[0].myFriendId = friend._id;
        await newUserProfile[0].save();

        await session.commitTransaction(); 

        return {login:newUserLogin[0], profile:newUserProfile[0]};
    } catch (error) {
        // If an error occurred, abort the whole transaction and
        // undo any changes that might have happened
        await session.abortTransaction();
        errorMessage = "Rollback transaction due to " + error.message;
        throw new Error(errorMessage);
    } finally {
        await session.endSession();
    }
}

const registerUser = async ({name = "", email = "", password = "", passwordConfirm = "", regcode = ""}) => {
    const data = {name:name, email:email, password:password, passwordConfirm: passwordConfirm, regcode: regcode};
    let newuser=null;

    await registerSchema.validate(data, { abortEarly: false })
    .then (async () => {
        let errorMessage;

        //console.log("validation ok", data);    
        if(process.env.REG_CODE !== data.regcode) {
            errorMessage = "Incorrect Reg Code";
            throw new Error(errorMessage);   
        }

        const user = await UserProfile.findOne( {email: email } );
        if(user) {
            errorMessage = "User already exists";
            throw new Error(errorMessage);   
        }
    
        const session = await mongoose.startSession();
        session.startTransaction();
        
        try {
            const options = { session, new: true };
    
            const newUserProfile = await UserProfile.create([{
                name: name,
                email: email,
                createdAt: new Date(),
                lastUpdatedAt: new Date()
            }], options);
    
            await newUserProfile[0].save();
    
            const newUserLogin = await UserLogin.create([{
                email: email,
                hashedPassword: password,
                type: "local",
                lastAccess: new Date(),
                createdAt: new Date(),
                lastUpdatedAt: new Date(),
                profile: newUserProfile[0]._id
            }], options);
    
            await newUserLogin[0].save();

            const friend = await Friend.create([{
                userProfile: newUserProfile[0]._id,
                isMyself: true,
                name: newUserProfile[0].name,        
                email: newUserProfile[0].email
            }], options);

            await friend[0].save();
    
            newUserProfile[0].myFriendId = friend._id;
            await newUserProfile[0].save();

            const accessToken = Token.generateAccessToken({ id: newUserLogin[0]._id, email: newUserLogin[0].email });
            const refreshToken = Token.generateRefreshToken({ id: newUserLogin[0]._id, email: newUserLogin[0].email });
            newuser = {login: newUserLogin[0], profile:newUserProfile[0], accessToken: accessToken, refreshToken: refreshToken};

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

    return newuser;
}

const verifyGoogleCredential = async (googleCredential) => {
    const response = await fetch(`${process.env.GOOGLE_API_URL}userinfo?access_token=${googleCredential.access_token}`, {
        method: "GET",
        headers: {
            "Authorization": `Bearer ${googleCredential}`,
            "Content-Type": "application/json",
        },

      });

    const result = await response.json()
    
    if(result.error) {
        console.log("Failed to verify google Account:", result.error.message)
        throw new Error("Failed to verify your Google Account")
    }

    return result;
}

const registerUserByGoogle = async ({googleCredential, regcode}) => {
    let errorMessage = "Failed to login by Google Account";
    let returnObj = null;

    try {
        const userInfo = await verifyGoogleCredential(googleCredential);
   
        if(process.env.REG_CODE !== regcode) {
            errorMessage = "Incorrect Registration Code.";
            throw new Error(errorMessage);   
        }

        let userLogin = await UserLogin.findOne({ email: new RegExp(`^${userInfo.email}$`, 'i'), type:"google" });
   
        if(!userLogin) {
            const randomPwd = [...Array(30)].map(() => Math.random().toString(36)[2]).join('');
            user = await createUserInDB(userInfo.name, userInfo.email, randomPwd, "google")
        } 

        const accessToken = Token.generateAccessToken({ id: user.login._id, email: user.login.email });
        const refreshToken = Token.generateRefreshToken({ id: user.login._id, email: user.login.email });

        const name = userInfo.name;
        const profileId = user.profile._id;
        const paymentLinkTemplate = user.profile?.paymentLinkTemplate;
        const bankAccountInfo = user.profile?.bankAccountInfo;
        const myFriendId = user.profile?.myFriendId;        
        const { hashedPassword, createdAt, __v, profile, ...otherData } = user.login._doc;
        returnObj = {auth : {...otherData, name, profileId, myFriendId, paymentLinkTemplate, bankAccountInfo, accessToken, refreshToken}};
    } catch (error) {
        throw new Error(JSON.stringify({message: error.message}));  
    }

    return returnObj;
}

const authUserByGoogle = async (googleCredential) => {
    let returnObj = null;

    try {
        const userInfo = await verifyGoogleCredential(googleCredential);

        let userLogin = await UserLogin.findOne({ email: new RegExp(`^${userInfo.email}$`, 'i'), type:"google" }).populate("profile");;
   
        if(!userLogin) {
            returnObj = {action: "register"};
        } else {
            const lastAccess = new Date();
            const accessToken = Token.generateAccessToken({ id: userLogin._id, email: userLogin.email });
            const refreshToken = Token.generateRefreshToken({ id: userLogin._id, email: userLogin.email });

            userLogin.lastAccess = lastAccess
            userLogin.save();

            const name = userInfo.name;
            const profileId = userLogin.profile._id;
            const paymentLinkTemplate = userLogin.profile?.paymentLinkTemplate;
            const bankAccountInfo = userLogin.profile?.bankAccountInfo;
            const myFriendId = userLogin.profile?.myFriendId;
            const { hashedPassword, createdAt, __v, profile, ...otherData } = userLogin._doc;
            returnObj = {auth : {...otherData, name, profileId, myFriendId, paymentLinkTemplate, bankAccountInfo, accessToken, refreshToken}};
        }
    } catch (error) {
        //throw new Error("Failed to login by Google ID")
        throw new Error(JSON.stringify({message: error.message}));  
    }

    return returnObj;
}

const authUser = async ({email = "", password = ""}) => {
    const data = {email: email, password: password};

    let errorMessage = "Invalid username and password";
    let returnObj = null;

    await loginSchema.validate(data, { abortEarly: false })
    .catch ((err) => {
        if(err.name === "ValidationError") {
            console.log(err.errors)
        } else {
            console.log(err)
        }
        throw new Error(JSON.stringify({message: err.message}));  
    });

    try {
       const userLogin = await UserLogin.findOne({ email: new RegExp(`^${email}$`, 'i'), type:"local" }).populate("profile");
   
        if(!userLogin) {
            //errorMessage = "Cannot find user"
            throw new Error(errorMessage);   
        }

        const isCorrectPwd = await userLogin.matchPassword(password);

        if(!isCorrectPwd) {
            //errorMessage = "wrong password"
            throw new Error(errorMessage);  
        }

        //const token = Token.generateTokenRS256({ id: userLogin._id, email: userLogin.email });
        const lastAccess = new Date();
        const accessToken = Token.generateAccessToken({ id: userLogin._id, email: userLogin.email });
        const refreshToken = Token.generateRefreshToken({ id: userLogin._id, email: userLogin.email });

        userLogin.lastAccess = lastAccess
        userLogin.save();

        const name = userLogin.profile.name;
        const profileId = userLogin.profile._id;
        const paymentLinkTemplate = userLogin.profile?.paymentLinkTemplate;
        const bankAccountInfo = userLogin.profile?.bankAccountInfo;
        const myFriendId = userLogin.profile?.myFriendId;    
        const { hashedPassword, createdAt, __v, profile, ...otherData } = userLogin._doc;
        returnObj = {auth : {...otherData, name, profileId, myFriendId, paymentLinkTemplate, bankAccountInfo, accessToken, refreshToken}};

    } catch (err) {
        throw new Error(JSON.stringify({message: err.message}));  
    }

    return returnObj;
}

const generateNewToken = async (token) => {
    const result = Token.isValidRefreshToken(token);

    if(result.isValidToken) {
        const userLogin = await UserLogin.findById(result.payload.id).populate("profile");
        if(!userLogin) {
            return {auth : ""};  
        }

        const name=userLogin.profile.name;
        const profileId = userLogin.profile._id;
        const paymentLinkTemplate = userLogin.profile?.paymentLinkTemplate;
        const bankAccountInfo = userLogin.profile?.bankAccountInfo;
        const myFriendId = userLogin.profile?.myFriendId;            
        const { hashedPassword, createdAt, __v, profile, ...otherData } = userLogin._doc;

        const accessToken = Token.generateAccessToken({ id: result.payload._id, email: result.payload.email });
        const refreshToken = Token.generateRefreshToken({ id: userLogin._id, email: userLogin.email });

        return {auth : {...otherData, name, profileId, myFriendId, paymentLinkTemplate, bankAccountInfo, accessToken, refreshToken}};
    }
    return {auth : ""};
}

const verifyToken = (type, token) => {
    let result = false;
    if(type === "access_token")
        result = Token.isValidAccessToken(token);
    else if (type === "refresh_token")
        result = Token.isValidRefreshToken(token);

    return result;
}

module.exports = {
    cleanUpUserData : cleanUpUserData,
    registerUser : registerUser,
    authUser: authUser,
    generateNewToken : generateNewToken,
    verifyToken: verifyToken,
    authUserByGoogle: authUserByGoogle,
    registerUserByGoogle: registerUserByGoogle,
}