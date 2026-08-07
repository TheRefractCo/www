import { defaultLang, languages, routes, ui, type Locale, type TranslationKey } from './ui';

export function isLocale(value: string | undefined): value is Locale {
	return value != null && value in languages;
}

export function getLangFromUrl(url: URL, currentLocale?: string): Locale {
	if (isLocale(currentLocale)) return currentLocale;

	const [, candidate] = url.pathname.split('/');
	return isLocale(candidate) ? candidate : defaultLang;
}

export function getPathWithoutLocale(pathname: string): string {
	const parts = pathname.split('/').filter(Boolean);
	if (isLocale(parts[0])) parts.shift();
	return parts.length > 0 ? `/${parts.join('/')}/` : '/';
}

export function useTranslations(lang: Locale) {
	const localizedUI = ui[lang] ?? {};

	return function translate(key: TranslationKey): string {
		return localizedUI[key] ?? ui[defaultLang][key] ?? key;
	};
}

export function useTranslatedPath(lang: Locale) {
	return function translatePath(path: string, targetLang: Locale = lang): string {
		const translatedPath = translateRouteSegments(path, targetLang);
		const localePrefix = targetLang === defaultLang ? '' : `/${targetLang}`;

		return `${localePrefix}/${translatedPath}`.replace(/([^:])\/+/g, '$1/').replace(/\/$/, '') || '/';
	};
}

export function translateRouteSegments(path: string, targetLang: Locale): string {
	const cleanPath = path.split(/[?#]/, 1)[0].replace(/^\/+|\/+$/g, '');
	const routeMap = routes[targetLang] ?? {};

	return cleanPath
		? cleanPath
			.split('/')
			.map((segment) => routeMap[segment] ?? segment)
			.join('/')
		: '';
}

export function getRouteFromUrl(url: URL, currentLocale?: string): string {
	const currentLang = getLangFromUrl(url, currentLocale);
	const path = getPathWithoutLocale(url.pathname);
	if (currentLang === defaultLang) return path;

	const reverseRoutes = Object.fromEntries(
		Object.entries(routes[currentLang] ?? {}).map(([source, translated]) => [translated, source]),
	);

	return (
		path
			.split('/')
			.filter(Boolean)
			.map((segment) => reverseRoutes[segment] ?? segment)
			.join('/') || '/'
	);
}

export function getDocRouteId(entryId: string, lang: Locale): string {
	const prefix = `${lang}/`;
	return entryId.startsWith(prefix) ? entryId.slice(prefix.length) : entryId;
}

export function getDocIdFromRoute(entryId: string, lang: Locale): string {
	return `${lang}/${entryId}`;
}

export { defaultLang, languages } from './ui';
export type { Locale, TranslationKey } from './ui';

export const localeList = Object.keys(languages) as Locale[];
