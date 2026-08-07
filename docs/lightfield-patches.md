# LightField patches

The site vendors the LightField runtime under `src/scripts/lightfield/` and uses
it for every hero outside `/paper/`. The runtime is intentionally kept local so
the page can use dual-color themes and Astro navigation without depending on a
separate package build.

## Patches in this site

### 1. Global stylesheet loading

`src/styles/lightfield.css` is imported by `BaseHead.astro`, not only by the
runtime module. Astro client navigation does not reliably re-run bundled module
scripts, so a route could receive the canvas markup without receiving the
absolute-positioning rules. That caused the canvas to enter normal document
flow and stretch a navigated hero.

### 2. Light-mode first paint

The component renders `data-theme="auto"` and a static fallback layer before
JavaScript starts. The fallback and the field itself start from the inherited
page background rather than a hard-coded dark color, then CSS resolves the
light/dark accent treatment immediately with `prefers-color-scheme`. This
prevents a dark intermediate paint while the stylesheet, runtime, and WebGL
context settle. The runtime then resolves the same theme for WebGL and listens
for system theme changes. The shader intro also blends from its computed
background instead of multiplying the first frames toward black; this is what
prevents the WebGL canvas itself from flashing dark in light mode.

### 3. Reused canvas across hero pages

The LightField root uses `transition:persist="refract-lightfield"`. Astro keeps
that element and its WebGL canvas when navigating between pages that contain a
hero. The controller is paused before navigation, retained if the root remains
connected, then refreshed with the new page colors, theme, interaction state,
and parent element before resuming. Because Astro preserves the root's own
attributes, each hero also exposes its current palette on the non-persisted
parent section; the runtime copies that route configuration onto the reused
root before calling the controller setters.

When navigating to `/paper/`, which intentionally has no LightField hero, the
controller is destroyed normally. A new controller is created when returning
to a LightField page.

### 4. Controller and sizing fixes

- The resize observer watches the hero root and measures its layout bounds,
  rather than trusting the canvas backing size.
- Mounting is delayed by two animation frames so the incoming page has settled
  before WebGL sizing occurs.
- Pointer listeners are rebound when the persisted LightField root moves to a
  new hero parent, so text and cards continue to drive interaction.
- The shared lifecycle is `before-preparation` → pause,
  `after-swap` → destroy only disconnected roots, and `page-load` → refresh or
  mount.

### 5. Background colors and hero fade

The shader defines the dark base through the `deepInk`/`midnight` colors and
the light base through `vec3(0.89, 0.915, 0.928)`, approximately `#e3e9ed`.
The CSS fallback uses `#020715` for dark mode and the light-mode field now uses
the same `#e3e9ed` value as the page background. Every hero adds a bottom
gradient covering 20% of its height so the field resolves into the page
background instead of ending abruptly.

### 6. Navigation motion

The header is persisted and kept outside the animated content shell so its
fixed positioning is never transformed during navigation. The only animated
scope is the shared content/footer shell; nested `<main>` and header scopes
were removed because their different width classes made the browser animate a
changing shared box, producing a center-zoom artifact between wide pages and
info pages. The shell uses a custom 280ms transition: a mostly-fade animation
with a 0.9rem directional drift. Forward and backward navigation use mirrored
keyframes, and shell group geometry animation is disabled. Reduced-motion users
receive an effectively immediate swap.

### 7. Header navigation state

The fixed header uses `transition:persist="refract-header"` and remains outside
the animated content shell, preventing navigation motion from creating a new
containing block for fixed positioning. It also uses `transition:animate="none"`:
the header is persisted for continuity but never receives a second transition
snapshot, which prevents the brief duplicate/ghost header frame during route
changes. Active state is recalculated from the current pathname after every
Astro page load, including nested blog routes, and `aria-current="page"`
follows the same rule. Header clicks are captured before Astro's router so the
current route cannot be tapped again. Route order also sets Astro's forward/back
direction for ordinary header links, so moving to a lower navigation item
visibly reverses the drift instead of always using the forward animation.
