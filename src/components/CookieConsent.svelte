<script lang="ts">
  	import posthog from 'posthog-js';
  import { onMount } from 'svelte';
  //import Clarity from '@microsoft/clarity';
  let showBanner = $state(true);
  let showPreferences = $state(false);
  
  let preferences = $state({
    ad_user_data: false,
    ad_personalization: false,
    ad_storage: false,
    analytics_storage: false
  });// Make sure to add your actual project id instead of "yourProjectId".
  const projectId = "nav9b1egpk"



  function updateConsent() {
    //todo move cookie consent posthog here or into onmount


    alert('Consent updated' + preferences.ad_personalization);
    
    gtag('consent', 'update', {
      ad_user_data: preferences.ad_user_data ? 'granted' : 'denied',
      ad_personalization: preferences.ad_personalization ? 'granted' : 'denied',
      ad_storage: preferences.ad_storage ? 'granted' : 'denied',
      analytics_storage: preferences.analytics_storage ? 'granted' : 'denied'
    });
    savePreferences(preferences);

  }

  function acceptAll() {
    window.clarity("consent")
    posthog.capture('cookie_consent_accepted');
    posthog.opt_in_capturing();
    preferences = Object.fromEntries(
      Object.keys(preferences).map(key => [key, true])
    );
    updateConsent();
    showBanner = false;
    gtag('event', 'screen_view', {
  'app_name': 'myAppName',
  'screen_name': 'Home'
});
  }

  function rejectAll() {
    window.clarity('consent', false)
    window.clarity('stop')  // required to stop, mentioned on their github
    posthog.opt_out_capturing()
    preferences = Object.fromEntries(
      Object.keys(preferences).map(key => [key, false])
    );
    updateConsent();
    showBanner = false;
  }


  export function setCookie(name: string, value: string, days: number) {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
}

export function getCookie(name: string) {
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
  return match ? match[2] : null;
}

export function savePreferences(preferences: object) {
  //updateConsent();
    showPreferences = false;
    showBanner = false;
  const value = JSON.stringify(preferences);
  localStorage.setItem('cookiePreferences', value);
  setCookie('cookiePreferences', value, 365);
}

export function loadPreferences() {
  const fromLocalStorage = localStorage.getItem('cookiePreferences');
  const fromCookie = getCookie('cookiePreferences');
  
  // Prefer localStorage, fallback to cookie
  const saved = fromLocalStorage || fromCookie;
  
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return null;
    }
  }
  return null;
}
onMount(() => {
  //window.clarity.init(projectId);
  window.clarity("consent")
    const savedPreferences = loadPreferences();
    if (savedPreferences) {
      preferences = savedPreferences;
      showBanner = false;
    }
  });
</script>

{#if showBanner}
  <div class="cookie-banner">
    <p>
      We use cookies to improve your experience. Choose your preferences below.
      <a href="/privacy-policy">Learn more</a>
    </p>
    <div class="buttons">
      <button on:click={acceptAll}>Accept All</button>
      <button on:click={rejectAll}>Reject All</button>
      <button on:click={() => showPreferences = true}>Preferences</button>
    </div>
  </div>
{/if}

{#if showPreferences}
  <div class="preferences-modal">
    <h2>Cookie Preferences</h2>
    <div class="preferences-list">
      <label>
        <input type="checkbox" bind:checked={preferences.ad_user_data}>
        Advertising User Data
      </label>
      <label>
        <input type="checkbox" bind:checked={preferences.ad_personalization}>
        Ad Personalization
      </label>
      <label>
        <input type="checkbox" bind:checked={preferences.ad_storage}>
        Ad Storage
      </label>
      <label>
        <input type="checkbox" bind:checked={preferences.analytics_storage}>
        Analytics Storage
      </label>
      <!-- todo: add posthog too -->
    </div>
    <div class="buttons">
      <button on:click={savePreferences}>Save Preferences</button>
      <button on:click={() => showPreferences = false}>Cancel</button>
    </div>
  </div>
{/if}

<style>
  .cookie-banner {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: white;
    padding: 1rem;
    box-shadow: 0 -2px 10px rgba(0,0,0,0.1);
  }

  .preferences-modal {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    padding: 2rem;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  }

  .preferences-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin: 1rem 0;
  }

  .buttons {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
  }
</style>