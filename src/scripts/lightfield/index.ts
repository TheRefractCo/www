import { fragmentShader, vertexShader } from './shader';

export type LightFieldTheme = 'dark' | 'light';
export type LightFieldQuality = 'auto' | 'high' | 'low' | 'fallback';

export interface LightFieldOptions {
	primary?: string;
	secondary?: string;
	dualColor?: boolean;
	theme?: LightFieldTheme;
	quality?: LightFieldQuality;
	interactive?: boolean;
}

export interface LightFieldController {
	setTheme(theme: LightFieldTheme): void;
	setColors(primary: string, secondary?: string): void;
	setDualColor(enabled: boolean): void;
	setInteractive(enabled: boolean): void;
	setFallback(enabled: boolean): void;
	refresh(): void;
	pause(): void;
	resume(): void;
	destroy(): void;
}

type Rgb = readonly [number, number, number];

const DEFAULT_PRIMARY = '#3bbcff';
const DEFAULT_SECONDARY = '#8b5cff';

function parseHexColor(value: string): Rgb {
	if (!/^#[0-9a-f]{6}$/i.test(value)) {
		throw new TypeError(`Invalid color "${value}". Use a six-digit hex value.`);
	}

	return [
		Number.parseInt(value.slice(1, 3), 16) / 255,
		Number.parseInt(value.slice(3, 5), 16) / 255,
		Number.parseInt(value.slice(5, 7), 16) / 255,
	];
}

function compileShader(gl: WebGLRenderingContext, type: number, source: string) {
	const shader = gl.createShader(type);
	if (!shader) return null;
	gl.shaderSource(shader, source);
	gl.compileShader(shader);
	return shader;
}

function ensureFallback(root: HTMLElement, canvas: HTMLCanvasElement) {
	const existing = root.querySelector<HTMLElement>('.lightfield__fallback');
	if (existing) return existing;

	const fallback = document.createElement('div');
	fallback.className = 'lightfield__fallback';
	fallback.ariaHidden = 'true';
	fallback.innerHTML = `
		<i class="lightfield__dust lightfield__dust--far"></i>
		<i class="lightfield__dust lightfield__dust--near"></i>
	`;
	canvas.insertAdjacentElement('afterend', fallback);
	return fallback;
}

export function createLightField(root: HTMLElement, options: LightFieldOptions = {}): LightFieldController {
	const canvas = root.querySelector<HTMLCanvasElement>('.lightfield__canvas');
	if (!canvas) {
		throw new Error('LightField requires a .lightfield__canvas element.');
	}

	root.classList.add('lightfield');
	ensureFallback(root, canvas);

	let theme = options.theme ?? 'dark';
	let primaryHex = options.primary ?? DEFAULT_PRIMARY;
	let secondaryHex = options.secondary ?? DEFAULT_SECONDARY;
	let primary = parseHexColor(primaryHex);
	let secondary = parseHexColor(secondaryHex);
	let dualColor = options.dualColor ?? false;
	let interactive = options.interactive ?? true;
	let forcedFallback = options.quality === 'fallback';
	let paused = false;
	let destroyed = false;
	let requestDraw = () => {};
	let stopDraw = () => {};
	let destroyRuntime = () => {};
	let resetPointer = () => {};
	let refreshRuntime = () => {};

	const applyPresentation = () => {
		root.dataset.theme = theme;
		root.style.setProperty('--lightfield-primary', primaryHex);
		root.style.setProperty('--lightfield-secondary', dualColor ? secondaryHex : primaryHex);
		root.toggleAttribute('data-dual-color', dualColor);
		root.toggleAttribute('data-force-fallback', forcedFallback);
	};

	const controller: LightFieldController = {
		setTheme(nextTheme) {
			theme = nextTheme;
			applyPresentation();
			requestDraw();
		},
		setColors(nextPrimary, nextSecondary = secondaryHex) {
			primary = parseHexColor(nextPrimary);
			secondary = parseHexColor(nextSecondary);
			primaryHex = nextPrimary;
			secondaryHex = nextSecondary;
			applyPresentation();
			requestDraw();
		},
		setDualColor(enabled) {
			dualColor = enabled;
			applyPresentation();
			requestDraw();
		},
		setInteractive(enabled) {
			interactive = enabled;
			if (!enabled) resetPointer();
		},
		setFallback(enabled) {
			forcedFallback = enabled;
			applyPresentation();
			if (enabled) stopDraw();
			else requestDraw();
		},
		refresh() {
			refreshRuntime();
			requestDraw();
		},
		pause() {
			paused = true;
			stopDraw();
		},
		resume() {
			paused = false;
			requestDraw();
		},
		destroy() {
			if (destroyed) return;
			destroyed = true;
			destroyRuntime();
			root.removeAttribute('data-lightfield-ready');
		},
	};

	applyPresentation();

	const deviceNavigator = navigator as Navigator & {
		deviceMemory?: number;
		connection?: { saveData?: boolean };
	};
	const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
	const coarsePointer = matchMedia('(pointer: coarse)').matches;
	const autoConstrained =
		coarsePointer ||
		(deviceNavigator.deviceMemory ?? 8) <= 4 ||
		(navigator.hardwareConcurrency || 8) <= 4;
	const quality = options.quality ?? 'auto';
	const constrained = quality === 'low' || (quality === 'auto' && autoConstrained);

	if (forcedFallback || deviceNavigator.connection?.saveData === true) {
		root.dataset.fallback = 'true';
		return controller;
	}

	const gl = canvas.getContext('webgl', {
		alpha: true,
		antialias: false,
		depth: false,
		powerPreference: constrained ? 'low-power' : 'high-performance',
	});

	if (!gl) {
		root.dataset.fallback = 'true';
		return controller;
	}

	const vertex = compileShader(gl, gl.VERTEX_SHADER, vertexShader);
	const fragment = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShader);
	const program = gl.createProgram();

	if (!vertex || !fragment || !program) {
		root.dataset.fallback = 'true';
		return controller;
	}

	gl.attachShader(program, vertex);
	gl.attachShader(program, fragment);
	gl.linkProgram(program);

	if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
		root.dataset.fallback = 'true';
		gl.deleteProgram(program);
		gl.deleteShader(vertex);
		gl.deleteShader(fragment);
		return controller;
	}

	gl.useProgram(program);

	const buffer = gl.createBuffer();
	if (!buffer) {
		root.dataset.fallback = 'true';
		return controller;
	}

	gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
	const position = gl.getAttribLocation(program, 'aPosition');
	gl.enableVertexAttribArray(position);
	gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

	const resolutionLocation = gl.getUniformLocation(program, 'uResolution');
	const pointerLocation = gl.getUniformLocation(program, 'uPointer');
	const energyLocation = gl.getUniformLocation(program, 'uPointerEnergy');
	const timeLocation = gl.getUniformLocation(program, 'uTime');
	const introLocation = gl.getUniformLocation(program, 'uIntro');
	const accentLocation = gl.getUniformLocation(program, 'uAccent');
	const accent2Location = gl.getUniformLocation(program, 'uAccent2');
	const dualColorLocation = gl.getUniformLocation(program, 'uDualColor');
	const lightModeLocation = gl.getUniformLocation(program, 'uLightMode');

	const maxDpr = quality === 'high' ? 1.75 : constrained ? 1.1 : 1.5;
	const maxPixelCount = quality === 'high' ? 3_000_000 : constrained ? 900_000 : 2_200_000;
	const frameInterval = constrained ? 1000 / 30 : 1000 / 60;
	const pointer = {
		x: 0.68,
		y: 0.56,
		tx: 0.68,
		ty: 0.56,
		energy: 0,
		targetEnergy: 0,
	};

	resetPointer = () => {
		pointer.tx = 0.68;
		pointer.ty = 0.56;
		pointer.targetEnergy = 0;
	};

	const start = performance.now();
	let frame = 0;
	let pageVisible = !document.hidden;
	let lastDraw = 0;
	let renderScale = constrained ? 0.9 : 1;
	let slowFrames = 0;
	let stableFrames = 0;
	let cssWidth = Math.max(1, canvas.clientWidth);
	let cssHeight = Math.max(1, canvas.clientHeight);
	let needsResize = true;
	let interactionTarget = root.parentElement ?? root;
	let interactionTargetBound = false;

	const resize = () => {
		if (!needsResize) return;
		const bounds = root.getBoundingClientRect();
		cssWidth = Math.max(1, bounds.width);
		cssHeight = Math.max(1, bounds.height);
		let dpr = Math.min(devicePixelRatio || 1, maxDpr) * renderScale;
		const requestedPixels = cssWidth * cssHeight * dpr * dpr;
		if (requestedPixels > maxPixelCount) dpr *= Math.sqrt(maxPixelCount / requestedPixels);
		const width = Math.max(1, Math.floor(cssWidth * dpr));
		const height = Math.max(1, Math.floor(cssHeight * dpr));
		if (canvas.width !== width || canvas.height !== height) {
			canvas.width = width;
			canvas.height = height;
			gl.viewport(0, 0, width, height);
		}
		needsResize = false;
	};

	const resizeObserver = new ResizeObserver(([entry]) => {
		if (!entry) return;
		const bounds = root.getBoundingClientRect();
		cssWidth = Math.max(1, bounds.width, entry.contentRect.width);
		cssHeight = Math.max(1, bounds.height, entry.contentRect.height);
		needsResize = true;
		requestDraw();
	});

	const schedule = () => {
		if (frame === 0 && !destroyed && !paused && !forcedFallback && pageVisible) {
			frame = requestAnimationFrame(render);
		}
	};

	const render = (now: number) => {
		frame = 0;
		if (destroyed || paused || forcedFallback || !pageVisible) return;
		if (!reducedMotion && now - lastDraw < frameInterval * 0.88) {
			schedule();
			return;
		}

		const drawDelta = lastDraw === 0 ? frameInterval : now - lastDraw;
		lastDraw = now;

		if (!reducedMotion) {
			if (drawDelta > frameInterval * 1.35) {
				slowFrames += 1;
				stableFrames = 0;
			} else {
				slowFrames = Math.max(0, slowFrames - 1);
				stableFrames += 1;
			}
			if (slowFrames >= 12 && renderScale > 0.62) {
				renderScale = Math.max(0.62, renderScale * 0.84);
				slowFrames = 0;
				stableFrames = 0;
				needsResize = true;
			} else if (stableFrames >= 240 && renderScale < 1) {
				renderScale = Math.min(1, renderScale + 0.06);
				stableFrames = 0;
				needsResize = true;
			}
		}

		resize();
		pointer.x += (pointer.tx - pointer.x) * 0.055;
		pointer.y += (pointer.ty - pointer.y) * 0.055;
		pointer.energy += (pointer.targetEnergy - pointer.energy) * 0.045;
		if (pointer.targetEnergy > 0) pointer.targetEnergy *= 0.997;

		const elapsed = (now - start) / 1000;
		gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
		gl.uniform2f(pointerLocation, pointer.x, pointer.y);
		gl.uniform1f(energyLocation, pointer.energy);
		gl.uniform1f(timeLocation, reducedMotion ? 7 : elapsed);
		gl.uniform1f(introLocation, reducedMotion ? 1 : Math.min(1, elapsed / 1.7));
		gl.uniform3f(accentLocation, primary[0], primary[1], primary[2]);
		gl.uniform3f(accent2Location, secondary[0], secondary[1], secondary[2]);
		gl.uniform1f(dualColorLocation, dualColor ? 1 : 0);
		gl.uniform1f(lightModeLocation, theme === 'light' ? 1 : 0);
		gl.drawArrays(gl.TRIANGLES, 0, 3);
		root.dataset.lightfieldReady = 'true';

		if (!reducedMotion) schedule();
	};

	const onPointerMove = (event: PointerEvent) => {
		if (!interactive) return;
		const rect = interactionTarget.getBoundingClientRect();
		if (!rect.width || !rect.height) return;
		pointer.tx = (event.clientX - rect.left) / rect.width;
		pointer.ty = 1 - (event.clientY - rect.top) / rect.height;
		pointer.targetEnergy = event.pointerType === 'mouse' ? 1 : 0.72;
	};
	const onPointerLeave = () => {
		pointer.targetEnergy = 0;
	};
	const onVisibility = () => {
		pageVisible = !document.hidden;
		if (pageVisible) schedule();
		else stopDraw();
	};
	const onContextLost = () => {
		root.dataset.fallback = 'true';
		stopDraw();
	};

	requestDraw = schedule;
	stopDraw = () => {
		if (frame !== 0) cancelAnimationFrame(frame);
		frame = 0;
	};
	destroyRuntime = () => {
		stopDraw();
		resizeObserver.disconnect();
		if (interactionTargetBound) {
			interactionTarget.removeEventListener('pointermove', onPointerMove);
			interactionTarget.removeEventListener('pointerleave', onPointerLeave);
		}
		document.removeEventListener('visibilitychange', onVisibility);
		canvas.removeEventListener('webglcontextlost', onContextLost);
		gl.deleteBuffer(buffer);
		gl.deleteProgram(program);
		gl.deleteShader(vertex);
		gl.deleteShader(fragment);
		gl.getExtension('WEBGL_lose_context')?.loseContext();
	};

	refreshRuntime = () => {
		const nextTarget = root.parentElement ?? root;
		if (interactionTargetBound && nextTarget === interactionTarget) return;
		if (interactionTargetBound) {
			interactionTarget.removeEventListener('pointermove', onPointerMove);
			interactionTarget.removeEventListener('pointerleave', onPointerLeave);
		}
		interactionTarget = nextTarget;
		interactionTarget.addEventListener('pointermove', onPointerMove, { passive: true });
		interactionTarget.addEventListener('pointerleave', onPointerLeave);
		interactionTargetBound = true;
	};

	resizeObserver.observe(root);
	refreshRuntime();
	document.addEventListener('visibilitychange', onVisibility);
	canvas.addEventListener('webglcontextlost', onContextLost);
	schedule();

	return controller;
}
