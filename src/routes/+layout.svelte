<script>
	/** @type {{children?: import('svelte').Snippet}} */
	let { children } = $props();
</script>

<h1>...</h1>
<!-- Root layout with analytics, or maybe I should add them in app.html-->
{@render children?.()}