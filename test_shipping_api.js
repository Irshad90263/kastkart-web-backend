import axios from "axios";

const orderId = "6a23c3bc55227b4c991cb0e3";
const url = `http://localhost:5000/api/shipping/create-order/${orderId}`;

async function test() {
  try {
    console.log(`Sending POST request to ${url}...`);
    const response = await axios.post(url);
    console.log("Success response:", response.data);
  } catch (error) {
    console.error("Error status:", error.response?.status);
    console.error("Error data:", error.response?.data);
    console.error("Error message:", error.message);
  }
}

test();
