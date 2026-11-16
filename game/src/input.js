// Keyboard and mouse state for the game. WASD or arrows move, the mouse
// aims, holding the button (or Space) fires. The canvas is drawn at a fixed
// logical size and scaled by CSS, so mouse positions are mapped back through
// the canvas bounding box.

export function createInput(canvas) {
  const input = {
    keys: new Set(),
    mouseX: 0,
    mouseY: 0,
    mouseDown: false,
    pressed: new Set(), // keys pressed since the last consume
    onKeyDown: null, // (code) => void, set by the game for menus
    onClick: null, // (x, y) => void, set by the game for menus

    axisX() {
      const left = this.keys.has('KeyA') || this.keys.has('ArrowLeft');
      const right = this.keys.has('KeyD') || this.keys.has('ArrowRight');
      return (right ? 1 : 0) - (left ? 1 : 0);
    },
    axisY() {
      const up = this.keys.has('KeyW') || this.keys.has('ArrowUp');
      const down = this.keys.has('KeyS') || this.keys.has('ArrowDown');
      return (down ? 1 : 0) - (up ? 1 : 0);
    },
    firing() {
      return this.mouseDown || this.keys.has('Space');
    },
    consume(code) {
      if (this.pressed.has(code)) {
        this.pressed.delete(code);
        return true;
      }
      return false;
    },
  };

  function toLogical(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  window.addEventListener('keydown', (event) => {
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
      event.preventDefault();
    }
    if (!event.repeat) {
      input.keys.add(event.code);
      input.pressed.add(event.code);
      if (input.onKeyDown) input.onKeyDown(event.code);
    }
  });
  window.addEventListener('keyup', (event) => {
    input.keys.delete(event.code);
  });
  window.addEventListener('blur', () => {
    input.keys.clear();
    input.mouseDown = false;
  });
  canvas.addEventListener('mousemove', (event) => {
    const p = toLogical(event);
    input.mouseX = p.x;
    input.mouseY = p.y;
  });
  canvas.addEventListener('mousedown', (event) => {
    const p = toLogical(event);
    input.mouseX = p.x;
    input.mouseY = p.y;
    input.mouseDown = true;
    if (input.onClick) input.onClick(p.x, p.y);
  });
  window.addEventListener('mouseup', () => {
    input.mouseDown = false;
  });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  return input;
}
