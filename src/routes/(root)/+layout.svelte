<script>
	import Header from "../../components/Header.svelte";
  /** @type {{children?: import('svelte').Snippet}} */
  let { children } = $props();

</script>
<Header type="main"></Header>
<main>
    {@render children?.()}
  </main>
  
  <footer>
    <p>© 2024</p>
  </footer>