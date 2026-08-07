export type AnalyticsConsentMode = 'required' | 'not-required' | 'off';

export interface AnalyticsRouteMeasurement {
	pathPrefix: string;
	measurementId: string;
}

const measurementIdPattern = /^G-[A-Z0-9]+$/;

const readMeasurementId = (value: string | undefined, variableName: string) => {
	const measurementId = value?.trim().toUpperCase();
	if (!measurementId) return undefined;

	if (!measurementIdPattern.test(measurementId)) {
		console.warn(`[analytics] Ignoring invalid ${variableName}. Expected a GA4 ID such as G-XXXXXXXXXX.`);
		return undefined;
	}

	return measurementId;
};

const readConsentMode = (value: string | undefined): AnalyticsConsentMode => {
	if (value === 'not-required' || value === 'off') return value;
	return 'required';
};

const defaultMeasurementId = readMeasurementId(
	import.meta.env.GOOGLE_ANALYTICS_ID,
	'GOOGLE_ANALYTICS_ID',
);
const paperMeasurementId = readMeasurementId(
	import.meta.env.GOOGLE_ANALYTICS_PAPER_ID,
	'GOOGLE_ANALYTICS_PAPER_ID',
);
const consentMode = readConsentMode(import.meta.env.ANALYTICS_CONSENT_MODE?.trim());

const measurements: AnalyticsRouteMeasurement[] = defaultMeasurementId
	? [
			...(paperMeasurementId && paperMeasurementId !== defaultMeasurementId
				? [{ pathPrefix: '/paper', measurementId: paperMeasurementId }]
				: []),
			{ pathPrefix: '/', measurementId: defaultMeasurementId },
		]
	: [];

export const analyticsConfig = {
	enabled: consentMode !== 'off' && measurements.length > 0,
	consentMode,
	consentStorageKey: 'refract.analytics-consent.v1',
	measurements,
};
