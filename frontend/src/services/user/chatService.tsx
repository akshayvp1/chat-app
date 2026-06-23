import axiosInstance from "../../utils/axiosInstance";
const API_BASE_URL = "/user";

async function getUsers() {
  try {
    const response = await axiosInstance.get(
      `${API_BASE_URL}/users-list`);

    return {
      success: true,
      data: response.data.users,
    };
  } catch (error) {
    return {
      success: false,
      message: "Failed to fetch users",
    };
  }
}

const logout = async () => {
  try {
    await axiosInstance.post("/user/logout");

    window.location.href = "/login";
  } catch (error) {
    console.log(error);
  }
};


const chatService={
getUsers,
logout
}
export default chatService