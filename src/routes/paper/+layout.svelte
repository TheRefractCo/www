<script>
  /** @type {{children?: import('svelte').Snippet}} */
  let { children } = $props();
</script>

<main>
    {@render children?.()}
  </main>
  
  <footer>
    <p>© 2024 Paper by Refract</p>
  </footer>
  