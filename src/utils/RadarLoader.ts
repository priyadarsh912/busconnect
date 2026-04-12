import { UnifiedRoute, getRoutesForState } from '../data/stateDatasets';

export type RadarBus = UnifiedRoute;

export const loadRadarBuses = async (): Promise<RadarBus[]> => {
    // Defaulting to Chandigarh for radar as it was the main testing ground
    return getRoutesForState('Chandigarh');
};
