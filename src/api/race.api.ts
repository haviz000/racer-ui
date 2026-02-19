import api from "./axios";

export const raceTestApi = (data: any) => api.post("/race-test", data)