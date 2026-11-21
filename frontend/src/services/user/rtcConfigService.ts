import axiosInstance from "../../utils/axiosInstance";

export interface RtcConfigResponse {
  iceServers: RTCIceServer[];
}

export async function fetchRtcConfiguration(): Promise<RTCIceServer[]> {
  const response = await axiosInstance.get<{
    success: boolean;
    data: RtcConfigResponse;
  }>("/rtc-config");

  const iceServers = response.data?.data?.iceServers;
  return Array.isArray(iceServers) ? iceServers : [];
}
