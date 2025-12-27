const jwt = require("jsonwebtoken");

require("dotenv").config();

class Token {
    static generateToken(payload, secretKey, expiresIn) {
        const token = jwt.sign (   
            payload, 
            secretKey,
            { 
                algorithm: 'HS256',
                expiresIn: expiresIn
            }
        );
        return token;
    }

    static generateAccessToken(payload) {    
        return this.generateToken(payload, process.env.JWT_ACCESS_TOKEN_KEY, process.env.JWT_ACCESS_TOKEN_EXPIRE_IN );
    }

    static generateRefreshToken(payload) {
        return this.generateToken(payload, process.env.JWT_REFRESH_TOKEN_KEY, process.env.JWT_REFRESH_TOKEN_EXPIRE_IN)
    }

    static isValidToken(token, secretKey) {
        return (
            jwt.verify(
                token, 
                secretKey, 
                { algorithms: ['HS256'] }, 
                (error, payload) => {
                    //console.log(new Date(payload.exp * 1000));
                    if (error) 
                        return {isValidToken: false};
                    return {isValidToken: true, payload: payload};;
                })
        );
    }

    static isValidAccessToken(token) {    
        return this.isValidToken(token, process.env.JWT_ACCESS_TOKEN_KEY);
    }

    static isValidRefreshToken(token) {
        return this.isValidToken(token, process.env.JWT_REFRESH_TOKEN_KEY);
    }

    static generateTokenRS256(payload) {
        const token = jwt.sign (   
            payload, 
            { key: JWT_PRIVATE_KEY, passphrase: process.env.JWT_RS256_KEY },
            { 
                algorithm: 'RS256',
                expiresIn: process.env.JWT_EXPIRE_IN 
            }
        );

        return token;
    }

    static isValidTokenRS256(token) {
        return (
            jwt.verify(token, 
            JWT_PUBLIC_KEY, 
            { algorithms: ['RS256'] }, 
            (error, payload) => {
                if (error) 
                    return false;

                return true;
            })
        );
    }
}

module.exports = Token;