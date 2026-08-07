type ConsentChoice = 'granted' | 'denied';

interface RouteMeasurement {
	pathPrefix: string;
	measurementId: string;
}

interface AnalyticsClientConfig {
	consentMode: 'required' | 'not-required';
	consentStorageKey: string;
	manualPageViews: boolean;
	measurements: RouteMeasurement[];
}

type Gtag = (...args: unknown[]) => void;

declare global {
	interface Window {
		dataLayer?: IArguments[];
		gtag?: Gtag;
		refractAnalyticsInitialized?: boolean;
	}
}

const configElement = document.querySelector<HTMLScriptElement>('#refract-analytics-config');

if (configElement?.textContent && !window.refractAnalyticsInitialized) {
	const config = JSON.parse(configElement.textContent) as AnalyticsClientConfig;
	window.refractAnalyticsInitialized = true;

	const readStoredChoice = (): ConsentChoice | undefined => {
		try {
			const value = window.localStorage.getItem(config.consentStorageKey);
			return value === 'granted' || value === 'denied' ? value : undefined;
		} catch {
			return undefined;
		}
	};

	const writeStoredChoice = (choice: ConsentChoice) => {
		try {
			window.localStorage.setItem(config.consentStorageKey, choice);
		} catch {
			// The choice still applies to this page when storage is unavailable.
		}
	};

	const storedChoice = readStoredChoice();
	let activeChoice: ConsentChoice =
		storedChoice ?? (config.consentMode === 'not-required' ? 'granted' : 'denied');
	let tagLoadStarted = false;
	let previousPageLocation = document.referrer;
	let lastPageViewKey: string | undefined;
	const configuredMeasurementIds = new Set<string>();

	window.dataLayer = window.dataLayer ?? [];
	window.gtag =
		window.gtag ??
		function () {
			window.dataLayer?.push(arguments);
		};

	const gtag = window.gtag;
	gtag('consent', 'default', {
		analytics_storage: activeChoice,
		ad_storage: 'denied',
		ad_user_data: 'denied',
		ad_personalization: 'denied',
		functionality_storage: 'granted',
		security_storage: 'granted',
	});
	gtag('set', 'ads_data_redaction', true);

	const measurementForPath = (pathname: string) =>
		config.measurements.find(({ pathPrefix }) => {
			if (pathPrefix === '/') return true;
			return pathname === pathPrefix || pathname.startsWith(`${pathPrefix}/`);
		})?.measurementId;

	const debugModeEnabled = () => new URLSearchParams(window.location.search).has('ga_debug');

	const configureMeasurement = (measurementId: string) => {
		if (configuredMeasurementIds.has(measurementId)) return;

		gtag('config', measurementId, {
			send_page_view: false,
			allow_google_signals: false,
			allow_ad_personalization_signals: false,
			debug_mode: debugModeEnabled(),
		});
		configuredMeasurementIds.add(measurementId);
	};

	const loadGoogleTag = () => {
		if (tagLoadStarted || activeChoice !== 'granted') return;

		const measurementId = measurementForPath(window.location.pathname);
		if (!measurementId) return;

		tagLoadStarted = true;
		gtag('js', new Date());
		configureMeasurement(measurementId);

		const script = document.createElement('script');
		script.async = true;
		script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
		script.dataset.refractAnalytics = 'google-tag';
		document.head.append(script);
	};

	const trackPageView = () => {
		if (activeChoice !== 'granted') return;

		loadGoogleTag();
		const measurementId = measurementForPath(window.location.pathname);
		if (!measurementId) return;

		configureMeasurement(measurementId);
		const pageLocation = window.location.href;
		const pageViewKey = `${measurementId}:${window.location.pathname}${window.location.search}`;
		if (pageViewKey === lastPageViewKey) return;

		gtag('event', 'page_view', {
			send_to: measurementId,
			page_title: document.title,
			page_location: pageLocation,
			page_referrer: previousPageLocation,
			debug_mode: debugModeEnabled(),
		});

		lastPageViewKey = pageViewKey;
		previousPageLocation = pageLocation;
	};

	const trackEvent = (eventName: string, parameters: Record<string, string>) => {
		if (activeChoice !== 'granted') return;

		loadGoogleTag();
		const measurementId = measurementForPath(window.location.pathname);
		if (!measurementId) return;

		configureMeasurement(measurementId);
		gtag('event', eventName, {
			...parameters,
			send_to: measurementId,
			transport_type: 'beacon',
			debug_mode: debugModeEnabled(),
		});
	};

	const deleteAnalyticsCookies = () => {
		const cookieNames = document.cookie
			.split(';')
			.map((cookie) => cookie.split('=')[0]?.trim())
			.filter((name): name is string => Boolean(name && /^_ga(?:_|$)/.test(name)));

		const domains = [window.location.hostname, `.${window.location.hostname}`];
		cookieNames.forEach((name) => {
			document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax`;
			domains.forEach((domain) => {
				document.cookie = `${name}=; Max-Age=0; path=/; domain=${domain}; SameSite=Lax`;
			});
		});
	};

	const consentMessage = (choice: ConsentChoice | undefined) => {
		if (choice === 'granted') {
			return 'Analytics is currently on. You can turn it off here at any time.';
		}
		if (choice === 'denied') {
			return 'Analytics is currently off. You can allow it here at any time.';
		}
		return 'If you allow it, Google Analytics will tell us which pages are useful and whether people find Paper. It stays off until you say yes.';
	};

	const syncConsentUi = () => {
		const currentStoredChoice = readStoredChoice();
		document.querySelectorAll<HTMLButtonElement>('[data-analytics-settings]').forEach((button) => {
			button.hidden = false;
		});

		document.querySelectorAll<HTMLElement>('[data-analytics-consent]').forEach((banner) => {
			const message = banner.querySelector<HTMLElement>('[data-analytics-consent-message]');
			const shouldShow = config.consentMode === 'required' && !currentStoredChoice;
			banner.hidden = !shouldShow;
			if (message) {
				message.firstChild?.remove();
				message.prepend(`${consentMessage(currentStoredChoice)} `);
			}
			banner.querySelectorAll<HTMLButtonElement>('[data-analytics-choice]').forEach((button) => {
				button.setAttribute(
					'aria-pressed',
					String(Boolean(currentStoredChoice && button.dataset.analyticsChoice === activeChoice)),
				);
			});
		});
	};

	const showConsentUi = () => {
		const currentStoredChoice = readStoredChoice() ?? activeChoice;
		const banner = document.querySelector<HTMLElement>('[data-analytics-consent]');
		if (!banner) return;

		const message = banner.querySelector<HTMLElement>('[data-analytics-consent-message]');
		banner.hidden = false;
		if (message) {
			message.firstChild?.remove();
			message.prepend(`${consentMessage(currentStoredChoice)} `);
		}
		banner.querySelectorAll<HTMLButtonElement>('[data-analytics-choice]').forEach((button) => {
			button.setAttribute('aria-pressed', String(button.dataset.analyticsChoice === activeChoice));
		});
		banner.querySelector<HTMLButtonElement>('[data-analytics-choice]')?.focus();
	};

	const updateConsent = (choice: ConsentChoice) => {
		const shouldReloadWithoutGoogle = choice === 'denied' && tagLoadStarted;
		activeChoice = choice;
		writeStoredChoice(choice);
		gtag('consent', 'update', {
			analytics_storage: choice,
			ad_storage: 'denied',
			ad_user_data: 'denied',
			ad_personalization: 'denied',
		});

		if (choice === 'granted') {
			lastPageViewKey = undefined;
			loadGoogleTag();
			trackPageView();
		} else {
			deleteAnalyticsCookies();
		}

		document.querySelectorAll<HTMLElement>('[data-analytics-consent]').forEach((banner) => {
			banner.hidden = true;
		});
		syncConsentUi();

		if (shouldReloadWithoutGoogle) window.location.reload();
	};

	document.addEventListener(
		'click',
		(event) => {
			const target = event.target instanceof Element ? event.target : null;
			const trackedElement = target?.closest<HTMLElement>('[data-analytics-event]');
			if (!trackedElement) return;

			const eventName = trackedElement.dataset.analyticsEvent;
			if (!eventName) return;

			const parameters: Record<string, string> = {};
			const parameterMap = {
				analyticsAction: 'interaction_action',
				analyticsLabel: 'interaction_label',
				analyticsLocation: 'interaction_location',
				analyticsNetwork: 'social_network',
				analyticsCarousel: 'carousel_name',
				analyticsDirection: 'direction',
			};

			Object.entries(parameterMap).forEach(([dataKey, parameterName]) => {
				const value = trackedElement.dataset[dataKey as keyof DOMStringMap];
				if (value) parameters[parameterName] = value;
			});

			trackEvent(eventName, parameters);
		},
		true,
	);

	document.addEventListener('click', (event) => {
		const target = event.target instanceof Element ? event.target : null;
		const choiceButton = target?.closest<HTMLButtonElement>('[data-analytics-choice]');
		const choice = choiceButton?.dataset.analyticsChoice;
		if (choice === 'granted' || choice === 'denied') {
			updateConsent(choice);
			return;
		}

		if (target?.closest('[data-analytics-settings]')) showConsentUi();
	});

	document.addEventListener('astro:page-load', () => {
		syncConsentUi();
		if (config.manualPageViews || !lastPageViewKey) trackPageView();
	});

	syncConsentUi();
	if (activeChoice === 'granted') {
		loadGoogleTag();
		trackPageView();
	}
}

export {};
