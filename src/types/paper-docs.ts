export interface PaperDocsData {
	docId: string;
	title: string;
	description: string;
	category: string;
	categoryOrder: number;
	order: number;
}

export interface PaperDocsNavEntry {
	id: string;
	docId: string;
	data: PaperDocsData;
}
