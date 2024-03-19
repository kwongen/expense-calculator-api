import fs from 'fs';
import path from 'path';
import { generateKeyPair } from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const GenerateJWTKeys = (secret = process.env.JWT_RS256_KEY) => {
  const folderPath = path.resolve(`${process.cwd()}/${process.env.JWT_KEY_PATH}`);
  generateKeyPair(
    'rsa',
    {
      modulusLength: 4096,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem',
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
        cipher: 'aes-256-cbc',
        passphrase: secret,
      },
    },
    (err, publicKey, privateKey) => {
      fs.writeFileSync(`${folderPath}/jwtRS256.key`, privateKey, error => {
        if (error) throw error;
      });
      fs.writeFileSync(`${folderPath}/jwtRS256.key.pub`, publicKey, error => {
        if (error) throw error;
      });
    },
  );
};

GenerateJWTKeys();