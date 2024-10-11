<script>
    export let type; // Declare the type prop
  </script>
  
  <header>
    {#if type === 'main'}
      <h1>Home page</h1>
    {:else}
      <h1>Another Type</h1>
    {/if}
  </header>
  