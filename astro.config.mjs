// @ts-check

import fs from 'node:fs';
import path from 'node:path';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';
import { defaultLang, languages, localeMetadata, routes, ui } from './src/i18n/ui.ts';

const siteUrl = 'https://refract.fyi';
const localeCodes = Object.keys(languages);
const fallbackLocales = Object.fromEntries(
	localeCodes
		.filter((locale) => locale !== defaultLang)
		.map((locale) => [locale, defaultLang]),
);

const readDocCatalog = (locale) => {
	const root = path.resolve('src/content/docs', locale);
	const documents = new Map();

	const visit = (directory) => {
		if (!fs.existsSync(directory)) return;

		for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
			const filePath = path.join(directory, entry.name);
			if (entry.isDirectory()) {
				visit(filePath);
				continue;
			}
			if (!entry.isFile() || !entry.name.endsWith('.md')) continue;

			const source = fs.readFileSync(filePath, 'utf8');
			const docId = source.match(/^docId:\s*(.+)$/m)?.[1]?.trim();
			if (!docId) continue;

			const route = path
				.relative(root, filePath)
				.replaceAll(path.sep, '/')
				.replace(/\.md$/, '');
			documents.set(route, docId);
		}
	};

	visit(root);
	return documents;
};

const sourceDocsByRoute = readDocCatalog(defaultLang);
const translatedDocIdsByLocale = Object.fromEntries(
	localeCodes.map((locale) => [locale, new Set(readDocCatalog(locale).values())]),
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

const withTrailingSlash = (pathname) => {
	const normalized = pathname.replace(/\/+$/, '');
	return normalized ? `${normalized}/` : '/';
};

const isDocsPath = (logicalPath) => logicalPath === 'paper/docs' || logicalPath.startsWith('paper/docs/');

const nonLocalizedLogicalPaths = new Set(['', 'about', 'blog', 'contact', 'privacy', 'projects']);

const isNonLocalizedFallbackPath = (pathname) => {
	const locale = localeFromPath(pathname);
	if (locale === defaultLang) return false;

	const logicalPath = logicalPathFor(pathname);
	return (
		nonLocalizedLogicalPaths.has(logicalPath) ||
		logicalPath.startsWith('blog/')
	);
};

const isUntranslatedDocPath = (pathname) => {
	const locale = localeFromPath(pathname);
	if (locale === defaultLang) return false;

	const logicalPath = logicalPathFor(pathname);
	if (!isDocsPath(logicalPath)) return false;

	const documentRoute = logicalPath.slice('paper/docs/'.length);
	if (!documentRoute) return false;

	const docId = sourceDocsByRoute.get(documentRoute);
	return Boolean(docId && !translatedDocIdsByLocale[locale]?.has(docId));
};

const isFallbackContentPath = (pathname) =>
	isNonLocalizedFallbackPath(pathname) || isUntranslatedDocPath(pathname) || logicalPathFor(pathname) === '404';

const isLegacyLocalizedDocsPath = (pathname) => {
	const locale = localeFromPath(pathname);
	if (locale === defaultLang) return false;

	const logicalPath = logicalPathFor(pathname);
	return isDocsPath(logicalPath) && normalizePath(pathname) !== localizedPathFor(logicalPath, locale);
};

const isIndexableLocalizedVariant = (logicalPath, locale) => {
	if (locale === defaultLang) return true;
	if (isNonLocalizedFallbackPath(localizedPathFor(logicalPath, locale))) return false;
	if (logicalPath === 'paper') return Boolean(ui[locale]);
	if (!isDocsPath(logicalPath)) return false;

	const documentRoute = logicalPath.slice('paper/docs/'.length);
	if (!documentRoute) return (translatedDocIdsByLocale[locale]?.size ?? 0) > 0;

	const docId = sourceDocsByRoute.get(documentRoute);
	return Boolean(docId && translatedDocIdsByLocale[locale]?.has(docId));
};

const getAlternateLinks = (itemUrl) => {
	const url = new URL(itemUrl);
	const logicalPath = logicalPathFor(url.pathname);
	const availableLocales = localeCodes.filter((locale) =>
		isIndexableLocalizedVariant(logicalPath, locale),
	);
	if (availableLocales.length < 2) return undefined;

	return availableLocales.map((locale) => ({
		url: new URL(withTrailingSlash(localizedPathFor(logicalPath, locale)), siteUrl).href,
		lang: localeMetadata[locale]?.hreflang ?? locale,
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
			filter: (page) => {
				const pathname = new URL(page).pathname;
				return !isLegacyLocalizedDocsPath(pathname) && !isFallbackContentPath(pathname);
			},
			serialize: (item) => {
				const links = getAlternateLinks(item.url);
				return links ? { ...item, links } : item;
			},
		}),
	],
});
