
import { UserData } from '../types';

// Convert string to buffer
const str2ab = (str: string) => new TextEncoder().encode(str);

// Convert buffer to hex string for storage
const ab2hex = (buf: ArrayBuffer) => {
  return Array.prototype.map.call(new Uint8Array(buf), (x: number) => ('00' + x.toString(16)).slice(-2)).join('');
};

// Convert hex string to buffer
const hex2ab = (hex: string) => {
  const bytes = new Uint8Array(Math.ceil(hex.length / 2));
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  return bytes.buffer;
};

// 1. Derive a Key from the Password (PBKDF2)
export const deriveKey = async (password: string, saltHex?: string): Promise<{ key: CryptoKey; salt: string }> => {
  const enc = new TextEncoder();
  
  // Import the password as key material
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  );

  // Use provided salt or generate new one
  const salt = saltHex ? hex2ab(saltHex) : window.crypto.getRandomValues(new Uint8Array(16));

  const key = await window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false, // Key is non-extractable
    ["encrypt", "decrypt"]
  );

  return { key, salt: saltHex || ab2hex(salt) };
};

// 2. Encrypt Data (AES-GCM)
export const encryptData = async (data: UserData, key: CryptoKey, salt: string): Promise<string> => {
  const iv = window.crypto.getRandomValues(new Uint8Array(12)); // Initialization Vector
  const encodedData = str2ab(JSON.stringify(data));

  const encryptedContent = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    key,
    encodedData
  );

  // Store format: SALT:IV:CIPHERTEXT (all hex)
  return `${salt}:${ab2hex(iv)}:${ab2hex(encryptedContent)}`;
};

// 3. Decrypt Data
export const decryptData = async (encryptedString: string, key: CryptoKey): Promise<UserData> => {
  const [saltHex, ivHex, dataHex] = encryptedString.split(':');
  
  if (!saltHex || !ivHex || !dataHex) throw new Error("Invalid Data Format");

  const iv = hex2ab(ivHex);
  const data = hex2ab(dataHex);

  const decryptedContent = await window.crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    key,
    data
  );

  const decoded = new TextDecoder().decode(decryptedContent);
  return JSON.parse(decoded);
};
