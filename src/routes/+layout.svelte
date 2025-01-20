<script>
	/** @type {{children?: import('svelte').Snippet}} */
	let { children } = $props();
	import posthog from 'posthog-js'
import { browser } from '$app/environment';
	import CookieConsent from '../components/CookieConsent.svelte';
export const load = async () => {

if (browser) {

  posthog.init(
	'phc_T91tIfSNIFQ84SwHPQHbSdIafqyOlKtu7M29lJUoSBq',
	{ 
	  api_host: 'https://eu.i.posthog.com',
	  autocapture: true,
	  opt_out_capturing_by_default: true,
	  person_profiles: 'always', // or 'always' to create profiles for anonymous users as well
	}
  );
  posthog.capture('layout_loaded');
}
return
};
load()
</script>
<style>
	@import '../styles/tokens.css';
	@import '../styles/landing.css';

	body {
		margin: 0;
		background-color: red;
		color: var(--primary-color);
	  font-size: var(--font-size);
	}

  </style>


{@render children?.()}
<!-- global layout - applied everywhere, /, /paper, etc 
 cookie consent is here as it has to be on every page and we don't need it separately-->
<CookieConsent/>

