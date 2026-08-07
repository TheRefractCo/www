// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';
import { defaultLang, languages, localeMetadata, routes } from './src/i18n/ui.ts';

const siteUrl = 'https://refract.fyi';
const localeCodes = Object.keys(languages);
const fallbackLocales = Object.fromEntries(
	localeCodes
		.filter((locale) => locale !== defaultLang)
		.map((locale) => [locale, defaultLang]),
);

const normalizePath = (pathname) => {
	const normalized = pathname.replace(/\/+$/, '');
	return normalized || '/';
};

const localeFromPath = (pathname) => {
	const [, candidate] = normalizePath(pathname).split('/');
	return localeCodes.includes(candidate) ? candidate : defaultLang;
};

const pathWithoutLocale = (pathname) => {
	const normalized = normalizePath(pathname);
	const firstSegment = normalized.split('/')[1];
	const prefix = localeCodes.includes(firstSegment) ? `/${firstSegment}` : '';
	const withoutPrefix = prefix && normalized.startsWith(prefix) ? normalized.slice(prefix.length) : normalized;
	return withoutPrefix || '/';
};

const routeMapFor = (locale) => routes[locale] ?? {};

const logicalPathFor = (pathname) => {
	const locale = localeFromPath(pathname);
	const reverseRoutes = Object.fromEntries(
		Object.entries(routeMapFor(locale)).map(([source, translated]) => [translated, source]),
	);

	return pathWithoutLocale(pathname)
		.split('/')
		.filter(Boolean)
		.map((segment) => reverseRoutes[segment] ?? segment)
		.join('/');
};

const localizedPathFor = (logicalPath, locale) => {
	const translatedPath = logicalPath
		.split('/')
		.filter(Boolean)
		.map((segment) => routeMapFor(locale)[segment] ?? segment)
		.join('/');
	const prefix = locale === defaultLang ? '' : `/${locale}`;
	return `${prefix}/${translatedPath}`.replace(/\/+/g, '/');
};

const isDocsPath = (logicalPath) => logicalPath === 'paper/docs' || logicalPath.startsWith('paper/docs/');

const isLegacyLocalizedDocsPath = (pathname) => {
	const locale = localeFromPath(pathname);
	if (locale === defaultLang) return false;

	const logicalPath = logicalPathFor(pathname);
	return isDocsPath(logicalPath) && normalizePath(pathname) !== localizedPathFor(logicalPath, locale);
};

const getDocAlternateLinks = (itemUrl) => {
	const url = new URL(itemUrl);
	const logicalPath = logicalPathFor(url.pathname);
	if (!isDocsPath(logicalPath)) return undefined;

	return localeCodes.map((locale) => ({
		url: new URL(`${localizedPathFor(logicalPath, locale)}/`, siteUrl).href,
		lang: localeMetadata[locale]?.sitemap ?? locale,
	}));
};

// https://astro.build/config
export default defineConfig({
	site: siteUrl,
	i18n: {
		locales: localeCodes,
		defaultLocale: defaultLang,
		fallback: fallbackLocales,
		routing: {
			prefixDefaultLocale: false,
			fallbackType: 'rewrite',
		},
	},
	integrations: [
		mdx(),
		sitemap({
			filter: (page) => !isLegacyLocalizedDocsPath(new URL(page).pathname),
			serialize: (item) => {
				const links = getDocAlternateLinks(item.url);
				return links ? { ...item, links } : item;
			},
			i18n: {
				defaultLocale: defaultLang,
				locales: Object.fromEntries(
					localeCodes.map((locale) => [locale, localeMetadata[locale]?.sitemap ?? locale]),
				),
			},
		}),
	],
});
