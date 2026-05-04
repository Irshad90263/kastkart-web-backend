import axios from "axios";

export const sendOtpSms = async (Mobile, otp) => {
  try {


    // const response = await axios.get(url, { params });
    const response = await axios.get(`enterOtpAPi=${process.env.AUTHKEY}&mobiles=${Mobile}&message=Your OTP Code is ${otp}. Do not share it with anyone. From VizStik . Developed by %23TeamDigiCoders&sender=DIGICO&route=4&country=91&DLT_TE_ID=${process.env.DLT_TE_ID}`);

    console.log("SMS API Response:", response.data);
    return true;

  } catch (error) {
    console.error("SMS Send Error:", error.message);
    return false;
  }
};
