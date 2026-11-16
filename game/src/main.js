// Lanternkeeper: the game loop and the wiring between the modules. A fixed
// timestep (120 Hz steps, capped) keeps the simulation identical at any
// display refresh rate; rendering is every animation frame.

import { VIEW } from './config.js';
import { createAudio } from './audio.js';
import { createInput } from './input.js';
import { createRenderer } from './render.js';
import { applyShot, readShotParams } from './shots.js';
import { createWorld } from './world.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const { shot, seed } = readShotParams();

const world = createWorld(shot ? seed : (Math.random() * 0xffffffff) >>> 0);
const input = createInput(canvas);
const audio = createAudio();
const renderer = createRenderer(canvas);

// Pause flag lives outside the world so the loop can freeze the sim.
let paused = false;
const frozen = applyShot(world, shot, audio);

// Menu keys and clicks, by state.
input.onKeyDown = (code) => {
  audio.ensure();
  if (code === 'KeyM') {
    audio.toggleMute();
    return;
  }
  if (code === 'KeyP' && (world.state === 'playing' || paused)) {
    paused = !paused;
    return;
  }
  if (world.state === 'title' && (code === 'Enter' || code === 'Space')) {
    audio.click();
    world.start();
    return;
  }
  if (world.state === 'gameover' && code === 'KeyR') {
    audio.click();
    world.start();
  }
};
input.onClick = () => {
  audio.ensure();
  if (world.state === 'title') {
    audio.click();
    world.start();
  } else if (world.state === 'gameover') {
    audio.click();
    world.start();
  }
};

let last = performance.now();
let acc = 0;
const STEP = 1 / 120;

// A debug handle for play-testing (read-only from the console): the live
// world, input and audio. The game never reads it back.
window.__game = { world, input, audio };

function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (!frozen && !paused) {
    acc += dt;
    let guard = 0;
    while (acc >= STEP && guard < 12) {
      world.update(STEP, input, audio);
      acc -= STEP;
      guard += 1;
    }
    if (guard >= 12) acc = 0;
  }
  renderer.draw(world, input);
  if (paused && world.state === 'playing') {
    ctx.fillStyle = 'rgba(5, 4, 15, 0.6)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    ctx.fillStyle = '#e8e6ff';
    ctx.font = 'bold 40px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', VIEW.width / 2, VIEW.height / 2);
    ctx.font = '16px system-ui, sans-serif';
    ctx.fillText('Press P to resume', VIEW.width / 2, VIEW.height / 2 + 34);
  }
  if (frozen) window.__shotReady = true;
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
