import { useMutation } from "@tanstack/react-query";
import { raceTestApi } from "../api/race.api";

export const useRaceTest = () => useMutation({
    mutationFn: raceTestApi
})