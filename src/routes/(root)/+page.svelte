<script>
    import posthog from 'posthog-js';
  
    function handleClick() {
      posthog.capture('home_button_clicked');
    }

    var isEnabledExperiment = false//posthog.getFeatureFlag('sample-experiment');

    function handleMouseMove(event) {
        const x = (event.clientX / window.innerWidth) * 100;
        const y = (event.clientY / window.innerHeight) * 100;
        document.documentElement.style.setProperty('--mouse-x', `${x}%`);
        document.documentElement.style.setProperty('--mouse-y', `${y}%`);
    }
    //const imgUrl = new URL('./layer1.png', import.meta.url).href

</script>

<style>
    :root {
        --mouse-x: 50%;
        --mouse-y: 50%;
    }
    main {
        background: radial-gradient(75.94% 75.94% at 40.17% 24.06%, rgba(166, 189, 203, 0.2) 0%, rgba(0, 0, 0, 0) 100%) /* warning: gradient uses a rotation that is not supported by CSS and may not behave as expected */, linear-gradient(180deg, #23516B 0%, #2B7A99 100%);
        /* background: radial-gradient(circle at var(--mouse-x) var(--mouse-y), #00008B, #0000CD); */
        min-height: 100vh;
        transition: background 0.2s ease;
        display: flex;
        justify-content: center;
    }
    main h1 {
        position: absolute;
        bottom: 400;
        color: white;
        font-size: 2rem;
    }
    main img {
        min-width: 100vw;
        min-height: 100vh;
        position: relative;
    }
</style>

<div id="app">
    <main on:mousemove={handleMouseMove}>
        <h1>Layer 1</h1>
        <img src="./layer1.png" alt="" />
    </main>
    <h1>{isEnabledExperiment ? 'Hello World' : 'Good Morning'}</h1>
    
    {#if isEnabledExperiment}
        <h2>Welcome to our experimental feature!</h2>
    {/if}
    
    <button on:click={handleClick}>Click me!</button>
</div>