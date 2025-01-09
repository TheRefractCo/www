<h1>Welcome to SvelteKit</h1>
<p>Visit <a href="/privacy">kit.svelte.dev</a> to read the documentation</p>

<script>
    import posthog from 'posthog-js';
  
    function handleClick() {
      posthog.capture('home_button_clicked');
    }

    var isEnabledExperiment = false//posthog.getFeatureFlag('sample-experiment');
</script>
  
<div id="app">
    <h1>{isEnabledExperiment ? 'Hello World' : 'Good Morning'}</h1>
    
    {#if isEnabledExperiment}
        <h2>Welcome to our experimental feature!</h2>
    {/if}
    
    <button on:click={handleClick}>Click me!</button>
</div>