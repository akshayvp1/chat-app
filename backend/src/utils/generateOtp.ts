export const generateOtp = (): string => {
    console.log("Generating OTP...");
  return Math.floor(
    100000 + Math.random() * 900000
  ).toString();
};