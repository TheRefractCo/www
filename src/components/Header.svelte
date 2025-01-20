<script>
  /** @type {{type: any}} */
  let { type } = $props();
  </script>
  <style>
    header {
      /* //make it float on top of everything */
      position: sticky;
    }
    nav ul li:not(:last-child)::after {
      content: url('/separator.svg');
      margin-left: 0.5rem;
    }
    nav ul {
      list-style: none;
      display: flex;
      gap: 1rem;
    }
  </style>
  <header>
    {#if type === 'main'}
      <nav>
        <ul>
          <li><a href="/"><img src="/icon.svg" alt="Home"></a></li>
          <li><a href="/about">About</a></li>
          <li><a href="/blog">Blog</a></li>
        </ul>
      </nav>
    {:else}
      <h1>Another Type</h1>
    {/if}
  </header>
  