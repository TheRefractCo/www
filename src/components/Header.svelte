<script>
  /** @type {{type: any}} */
  let { type } = $props();
  </script>
  
  <header>
    {#if type === 'main'}
      <h1>Home page</h1>
    {:else}
      <h1>Another Type</h1>
    {/if}
  </header>
  