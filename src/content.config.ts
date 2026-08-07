import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const blog = defineCollection({
	// Load Markdown and MDX files in the `src/content/blog/` directory.
	loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
	// Type-check frontmatter using a schema
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			description: z.string(),
			// Transform string to Date object
			pubDate: z.coerce.date(),
			updatedDate: z.coerce.date().optional(),
			heroImage: z.optional(image()),
		}),
});

const docsSchema = z.object({
	docId: z.string().min(1),
	title: z.string(),
	description: z.string(),
	category: z.string(),
	categoryOrder: z.number().int().default(1),
	order: z.number().int().default(1),
	kind: z.enum(['overview', 'article']).default('article'),
});

const docs = defineCollection({
	// Documentation is grouped by language inside one collection. The stable
	// docId in frontmatter is shared by every translation of the same document.
	loader: glob({ base: './src/content/docs', pattern: '**/*.md' }),
	schema: docsSchema,
});

export const collections = { blog, docs };
