import axios from "axios";

export const sendOtpSms = async (Mobile, otp) => {
  try {
    const url = "https://iqsms.airtel.in/api/v1/send-prepaid-sms";
    
    const customerId = process.env.AIRTEL_CUSTOMER_ID || "847feb27-6f5e-4c0f-af0f-6526ce85a218";
    const username = process.env.AUTHKEY || "c8abdffe_e9dc_4a96_8c29_2bf0fc706ac3";
    const password = process.env.AIRTEL_PASSWORD || "apLUtGB9mK";
    
    const authString = Buffer.from(`${username}:${password}`).toString('base64');
    
    const requestData = {
      customerId: customerId,
      destinationAddress: [`91${Mobile}`],
      dltTemplateId: process.env.DLT_TE_ID || "1007583783953299880",
      entityId: "1001131885970460438",
      message: `Dear User, OTP for login is ${otp}. Valid for 5 minutes. Do not share with anyone. Team KaashtKart`,
      messageType: "SERVICE_EXPLICIT",
      sourceAddress: "KASHTK"
    };

    const response = await axios.post(url, requestData, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authString}`
      }
    });

    console.log("SMS API Response:", response.data);
    return true;

  } catch (error) {
    console.error("SMS Send Error:", error.response?.data || error.message);
    return false;
  }
};
