1. Initialize npm
    $ npm init

2. Install required packages
    $ npm install express bcrypt jsonwebtoken mongoose dotenv cors

3. Install nodemon for development purpose
    $ npm install --save-dev nodemon

4. Update package.json with the following line in script section
    "start": "nodemon server.js"

5. Generate Key Pairs
    $ node GenerateJWTKeys.mjs

6. Start server
    $ npm start


Generate self-signed SSL cert:
1. Generate a private key (localhost-key.pem)
    $ openssl genrsa -out localhost-key.pem 2048

2. Create a self-signed certificate (cert.pem)
    $ openssl req -new -x509 -sha256 -days 365 -key localhost-key.pem -out localhost.pem 

Note: you can use GitBash to run openssl in Windows