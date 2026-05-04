import axios from "axios";
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

let token = null;
let tokenExpiry = null;

const BASE_URL = process.env.SHIPROCKET_BASE_URL;

// Debug: Check if env vars are loaded
console.log('🔧 Shiprocket Config:', {
  baseUrl: BASE_URL,
  email: process.env.SHIPROCKET_EMAIL ? 'Set' : 'Missing',
  password: process.env.SHIPROCKET_PASSWORD ? 'Set' : 'Missing'
});

// 🔹 Login & Token Generate
const loginShiprocket = async () => {
  const res = await axios.post(`${BASE_URL}/auth/login`, {
    email: process.env.SHIPROCKET_EMAIL,
    password: process.env.SHIPROCKET_PASSWORD,
  });

  token = res.data.token;
  tokenExpiry = Date.now() + 9 * 24 * 60 * 60 * 1000; // 9 days

  return token;
};

// 🔹 Get Valid Token
export const getShiprocketToken = async () => {
  if (token && Date.now() < tokenExpiry) {
    return token;
  }
  return await loginShiprocket();
};

// 🔹 Shiprocket Axios Instance
export const shiprocketRequest = async (method, url, data = {}) => {
  const authToken = await getShiprocketToken();

  return axios({
    method,
    url: `${BASE_URL}${url}`,
    data,
    headers: {
      Authorization: `Bearer ${authToken}`,
      "Content-Type": "application/json",
    },
  });
};
