import type { HomeAssistant } from "../types";

export interface RandomStation {
  name: string;
  url: string;
  mime_type: string;
  uuid: string;
}

export const getRandomStation = (hass: HomeAssistant): Promise<RandomStation> =>
  hass.callWS<RandomStation>({
    type: "radio_browser/random_station",
  });
