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

export interface FavoriteStation {
  uuid: string;
  name: string;
  url_resolved?: string;
  favicon?: string;
  codec?: string;
}

export const getFavoriteStations = (
  hass: HomeAssistant
): Promise<{ favorites: FavoriteStation[] }> =>
  hass.callWS({
    type: "radio_browser/favorites/list",
  });

export const addFavoriteStation = (
  hass: HomeAssistant,
  uuid: string
): Promise<void> =>
  hass.callWS({
    type: "radio_browser/favorites/add",
    uuid,
  });

export const removeFavoriteStation = (
  hass: HomeAssistant,
  uuid: string
): Promise<void> =>
  hass.callWS({
    type: "radio_browser/favorites/remove",
    uuid,
  });
