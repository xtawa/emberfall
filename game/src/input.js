// input.js — keyboard and mouse state, in canvas coordinates.
// The game reads this once per frame; edge-triggered presses (justPressed,
// clicked) are consumed by calling endFrame() after the game has read them.

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.pressed = new Set();
    this.mouse = { x: 0, y: 0, down: false, clicked: false };
    this.anyGesture = false;

    window.addEventListener('keydown', (event) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
        event.preventDefault();
      }
      if (!event.repeat) this.pressed.add(event.code);
      this.keys.add(event.code);
      this.anyGesture = true;
    });
    window.addEventListener('keyup', (event) => {
      this.keys.delete(event.code);
    });
    window.addEventListener('blur', () => {
      this.keys.clear();
    });

    canvas.addEventListener('mousemove', (event) => {
      this.updateMouse(event);
    });
    canvas.addEventListener('mousedown', (event) => {
      this.updateMouse(event);
      this.mouse.down = true;
      this.mouse.clicked = true;
      this.anyGesture = true;
    });
    window.addEventListener('mouseup', () => {
      this.mouse.down = false;
    });
    canvas.addEventListener('contextmenu', (event) => event.preventDefault());
  }

  updateMouse(event) {
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = (event.clientX - rect.left) * (this.canvas.width / rect.width);
    this.mouse.y = (event.clientY - rect.top) * (this.canvas.height / rect.height);
  }

  down(code) {
    return this.keys.has(code);
  }

  justPressed(code) {
    return this.pressed.has(code);
  }

  // True while any movement key is held, as a normalised direction vector.
  moveVector() {
    let x = 0;
    let y = 0;
    if (this.down('KeyA') || this.down('ArrowLeft')) x -= 1;
    if (this.down('KeyD') || this.down('ArrowRight')) x += 1;
    if (this.down('KeyW') || this.down('ArrowUp')) y -= 1;
    if (this.down('KeyS') || this.down('ArrowDown')) y += 1;
    if (x === 0 && y === 0) return { x: 0, y: 0 };
    const len = Math.hypot(x, y);
    return { x: x / len, y: y / len };
  }

  endFrame() {
    this.pressed.clear();
    this.mouse.clicked = false;
  }
}
