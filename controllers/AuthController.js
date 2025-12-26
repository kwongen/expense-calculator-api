require('dotenv').config();

const jwt = require("jsonwebtoken");

const { registerUser, registerUserByGoogle, authUser, authUserByGoogle, verifyToken, generateNewToken } = require("./AuthLogic");

class AuthController {
    static issueRefreshTokenCookie(res, token) {
        res.cookie("refreshToken", token, {
            httpOnly: true,
            path: "/api/auth/refresh-token",
            domain: process.env.SERVER_DOMAIN,
            // secure = only send cookie over https
            secure: true,
            // sameSite = only send cookie if the request is coming from the same origin
            sameSite: "lax", // "strict" | "lax" | "none" (secure must be true)
            // maxAge = how long the cookie is valid for in milliseconds
            maxAge: 10 * 60 * 1000, // 10 min
        });   
    }

    static async register(req, res) {
        try {
            const result = await registerUser(req.body);

            // const result = {auth: {
            //                         _id: user.login._id,
            //                         email: user.login.email,
            //                         myFriendId: user.profile.myFriendId,
            //                         paymentLinkTemplate: user.profile.paymentLinkTemplate,
            //                         bankAccountInfo: user.profile.bankAccountInfo,
            //                         lastAccess: user.login.lastAccess,
            //                         name: user.profile.name,
            //                         profileId: user.profile._id,
            //                         accessToken: user.accessToken
            //                     }
            //                 }
    
            //AuthController.issueRefreshTokenCookie(res, user.refreshToken);
            AuthController.issueRefreshTokenCookie(res, result.auth.refreshToken);

            res.status(200).json(result);
            res.end();
        } catch (error) {
            console.log("register:", error);
            res.set('Content-Type', 'application/json')
            res.status(401).send(error.message);
        };
    }

    static async googleLogin(req, res) {
        try {
            const result = await authUserByGoogle(req.body)

            if(result.auth) {
                AuthController.issueRefreshTokenCookie(res, result.auth.refreshToken);

                delete result.auth.refreshToken;
            }

            res.status(200).json(result);
            res.end();
        } catch (error) {
            console.log("googleLogin:", error);
            res.set('Content-Type', 'application/json')
            res.status(401).send(error.message);
        }
    }

    static async googleRegister(req, res) {
        try {
            const result = await registerUserByGoogle(req.body)

            AuthController.issueRefreshTokenCookie(res, result.auth.refreshToken);

            delete result.auth.refreshToken;

            res.status(200).json(result);
            res.end();
        } catch (error) {
            console.log("googleRegister:", error);
            res.set('Content-Type', 'application/json')
            res.status(401).send(error.message);
        }
    }

    static async login(req, res) {
        try {
            const result = await authUser(req.body)

            AuthController.issueRefreshTokenCookie(res, result.auth.refreshToken);

            // 20251226: keep refresh token in response for mobile clients
            //delete result.auth.refreshToken;

            res.status(200).json(result);
            res.end();
        } catch (error) {
            console.log("login:", error);
            res.set('Content-Type', 'application/json')
            res.status(401).send(error.message);
        }
    }

    static logout(req, res) {
        res.clearCookie("refreshToken", {
            httpOnly: true,
            path: "/api/auth/refresh-token",
            domain: process.env.SERVER_DOMAIN,
            secure: true,
            sameSite: "lax"})
        res.sendStatus(204);
    }

    static async refreshToken(req, res) {
        const token = req.cookies.refreshToken
        //console.log("AuthController.refreshToken:", token)
        if (token) {
            try {
                const result = await generateNewToken(token);
                //console.log("AuthController.refreshToken:",result);
                if(!result.auth || result.auth.length === 0) {
                    res.status(401).json("Unable to initiate session");
                } else {
                    AuthController.issueRefreshTokenCookie(res, result.auth.refreshToken);
            
                    delete result.auth.refreshToken;

                    res.status(200).json(result);
                }
                res.end()
            } catch (error) {
                console.log("refreshToken:", error);
                res.status(401).json(error.message);
                res.end()
            }
        } else {
            console.log("refreshToken:", token);
            res.status(401).json("Invalid or expired session");
            res.end()
        } 
    }

    static async refreshTokenMobile(req, res) {
        const authHeader = req.headers.authorization;
        const token = authHeader!=null ? authHeader.split(" ")[1] : null;

        if (token) {
            try {
                const result = await generateNewToken(token);
                //console.log("AuthController.refreshToken:",result);
                if(!result.auth || result.auth.length === 0) {
                    res.status(401).json("Unable to initiate session");
                } else {
                    res.status(200).json(result);
                }
                res.end()
            } catch (error) {
                console.log("refreshToken:", error);
                res.status(401).json(error.message);
                res.end()
            }
        } else {
            console.log("refreshToken:", token);
            res.status(401).json("Invalid or expired session");
            res.end()
        } 
    }

    static verifyAccessToken(req, res, next) {
        const authHeader = req.headers.authorization;

        if (authHeader) {
            const token = authHeader.split(" ")[1];

            const result = verifyToken("access_token", token);

            if(result.isValidToken) {
                next();
            } else {
                res.status(401).json("Invalid access token");
            }
        } else {
            console.log("verifyAccessToken:", authHeader);
            res.status(401).json("You are not authenticated!");
            res.end()
        } 
    }
}


module.exports = AuthController