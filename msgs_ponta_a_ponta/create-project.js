// create-project.js
const fs = require("fs");
const path = require("path");

console.log("Iniciando a criação da estrutura do projeto...");

// --- Base64 Data for Icons ---
const icons = {
  icon128: `iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH6AYMECgB/zL3ygAABKJJREFUeNrt3U1oHFUYB/DPdGfapJk0iWajJhaLgkWLgqUIiiAiiIgooSgIIl4Uf4iCFy8KguBF8eJFEC+eRBAUvHhQBC+KICgqWk1TjJpYjI1am0w2m0x2Z3Y+mG1i02yS7OzO7PzP/3A7O/vN9/vO7M7s7I4gCIIgCIIgCIIgCIIgCIIgCIIgCIIgCIIgCIIgCIIgCIIgCIIgCOI/4lA5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A5A1A-`,
  icon48: `iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH6AYMECgG3o+2lAAAAiNJREFUaN7tmk1PGkEUx3/fF4gLSAjohYASEgJCIoQQQhQh2IADFhRs2FEcOHFk+A9c+BtcOHEgjp04siNGFBtYsCKIgiAKgoBQiYQEIiQk9MLyZt5L08w0M+9N85M8mXnve9/3vTfz3rx5gP/kQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQ-`,
  icon16: `iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH6AYMECgqQ/h+4wAAAPNJREFUOMvV0r0rQ1EUxvFfF4gLSAjohYASEgJCIoQQQhQh2IADFhRs2FEcOHFk+A9c+BtcOHEgjp04siNGFBtYsCKIgiAKgoBQiYQEIiQk9MLyZt5L08w0M+9N85M8mXnve9/3vTfz3rx5gP/kQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUcQOUc-`,
};

const projectStructure = {
  "secure-p2p-chat": {
    server: {
      "package.json": `{
  "name": "p2p-signaling-server",
  "version": "1.0.0",
  "description": "Minimal signaling server for WebRTC P2P Chat Extension",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "author": "",
  "license": "ISC",
  "dependencies": {
    "ws": "^8.17.0"
  }
}`,
      "server.js": `// server/server.js

const WebSocket = require('ws');
const url = require('url');

// Inicia o servidor WebSocket na porta 8080.
const port = process.env.PORT || 8080;
const wss = new WebSocket.Server({ port: port });

// Um Map para armazenar os clientes conectados, associando um ID único a cada socket.
const clients = new Map();

console.log(\`✅ Servidor de sinalização iniciado na porta \${port}...\`);

wss.on('connection', (ws, req) => {
    // Verifica se um ID foi solicitado via query string (?id=...)
    const parameters = url.parse(req.url, true);
    let id = parameters.query.id;

    if (!id || clients.has(id)) {
        id = Math.random().toString(36).substring(2, 9);
    }
    clients.set(id, ws);
    console.log(\`🔌 Cliente conectado com ID: \${id}\`);

    // Envia o ID gerado de volta para o cliente para que ele saiba quem é.
    ws.send(JSON.stringify({ type: 'your-id', id }));

    ws.on('message', (messageAsString) => {
        let data;
        try {
            data = JSON.parse(messageAsString);
        } catch (e) {
            console.error('❌ Mensagem JSON inválida recebida:', messageAsString);
            return;
        }

        const targetClient = clients.get(data.target);

        // Verifica se o cliente de destino existe e está com a conexão aberta.
        if (targetClient && targetClient.readyState === WebSocket.OPEN) {
            // Adiciona o ID do remetente à mensagem para que o destinatário saiba de quem veio.
            data.from = id;
            console.log(\`➡️  Retransmitindo mensagem de \${id} para \${data.target} (tipo: \${data.type})\`);
            
            // O servidor NUNCA inspeciona o conteúdo de 'payload'.
            // Ele apenas retransmite a mensagem, garantindo a privacidade.
            targetClient.send(JSON.stringify(data));
        } else {
            console.warn(\`⚠️  Cliente alvo \${data.target} não encontrado ou desconectado.\`);
        }
    });

    ws.on('close', () => {
        // Quando um cliente se desconecta, remove-o do mapa.
        clients.delete(id);
        console.log(\`🔌 Cliente \${id} desconectado.\`);
    });

    ws.on('error', (error) => {
        console.error(\`❌ Erro no WebSocket do cliente \${id}:\`, error);
    });
});`,
    },
    extension: {
      icons: {
        "icon16.png": { base64: icons.icon16 },
        "icon48.png": { base64: icons.icon48 },
        "icon128.png": { base64: icons.icon128 },
      },
      "manifest.json": `{
  "manifest_version": 3,
  "name": "P2P Secure Chat",
  "version": "1.0.0",
  "description": "Comunicação P2P com criptografia de ponta a ponta (E2EE).",
  "permissions": [
    "storage"
  ],
  "host_permissions": [
    "ws://*/*",
    "wss://*/*"
  ],
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}`,
      "popup.html": `<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <title>P2P Secure Chat</title>
    <link rel="stylesheet" href="popup.css">
    <style>
      .message.system {
        align-self: center;
        background-color: transparent;
        box-shadow: none;
        color: #6c757d;
        font-size: 12px;
        font-style: italic;
        padding: 4px;
        border: none;
        text-align: center;
      }
      .message.error { color: #dc3545; font-weight: bold; }
      .message.warning { color: #856404; }
      .message.success { color: #28a745; }
    </style>
</head>
<body>
    <div id="app">
        <header class="app-header">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <h1>P2P Secure Chat</h1>
                <button id="pin-btn" style="background: none; border: none; cursor: pointer; font-size: 16px; padding: 0;" title="Fixar Janela">📌</button>
            </div>
            <div id="connection-status">
                <span id="my-id-display">Seu ID: <span>Carregando...</span> <button id="edit-id-btn" style="background:none; border:none; cursor:pointer; font-size:12px; padding:0; color:#007bff;" title="Alterar ID">✏️</button></span>
                <span id="peer-status" class="offline" title="Status do outro usuário"></span>
            </div>
            <div id="conversation-info" style="text-align: center; font-size: 12px; font-weight: bold; margin-top: 5px; color: #007bff; display: none;"></div>
        </header>

        <main id="setup-view">
            <div style="text-align: center; margin-bottom: 15px;">
                <label style="font-size: 12px; margin-right: 10px;">Modo de Conexão:</label>
                <select id="connection-mode" style="padding: 4px;">
                    <option value="auto">Automático (Servidor)</option>
                    <option value="manual">Manual (Sem Servidor)</option>
                </select>
            </div>

            <div id="setup-messages" style="min-height: 20px; margin-bottom: 10px;"></div>
            
            <!-- Modo Manual UI -->
            <div id="manual-mode-ui" class="hidden">
                <p style="font-size: 12px; color: #666; margin-bottom: 10px;">Troque os códigos abaixo com seu contato.</p>
                <button id="create-manual-offer-btn" style="width: 100%; margin-bottom: 10px;">Gerar Meu Código (Convite)</button>
                <textarea id="manual-code-display" readonly placeholder="Seu código aparecerá aqui. Copie e envie para o contato." style="width: 100%; height: 60px; font-size: 11px; margin-bottom: 10px; display: none;"></textarea>
                <div class="input-group" style="flex-direction: column;">
                    <textarea id="manual-code-input" placeholder="Cole o código recebido aqui..." style="width: 100%; height: 60px; font-size: 11px; resize: none;"></textarea>
                    <button id="process-manual-code-btn" style="width: 100%; margin-top: 5px;">Processar Código Recebido</button>
                </div>
            </div>

            <!-- Modo Auto UI -->
            <div id="auto-mode-ui">
            <div class="input-group" style="margin-bottom: 10px;">
                <input type="text" id="signaling-url-input" placeholder="URL do Servidor (ws://...)" value="ws://localhost:8080">
            </div>
            <div class="input-group">
                <input type="text" id="peer-id-input" placeholder="ID do outro usuário">
                <button id="connect-btn">Conectar</button>
            </div>
            </div>

            <div id="saved-contacts-container" style="margin-top: 15px; border-top: 1px solid #eee; padding-top: 10px;">
                <h3 style="font-size: 14px; margin: 0 0 10px 0;">Contatos Salvos</h3>
                <div class="input-group" style="margin-bottom: 5px;">
                    <input type="text" id="contact-id-to-save" placeholder="ID do contato (para salvar)">
                </div>
                <div class="input-group">
                    <input type="text" id="contact-nickname" placeholder="Apelido (opcional)">
                    <button id="save-contact-btn" title="Salvar ID digitado acima">Salvar</button>
                </div>
                <ul id="contacts-list" style="list-style: none; padding: 0; margin-top: 10px; max-height: 100px; overflow-y: auto;"></ul>
            </div>
        </main>

        <main id="chat-view" class="hidden">
            <div id="messages"></div>
            <div id="input-area">
                <input type="text" id="message-input" placeholder="Digite uma mensagem segura..." autocomplete="off">
                <label for="image-input" class="file-label" title="Enviar imagem">🖼️</label>
                <input type="file" id="image-input" accept="image/*" class="hidden">
                <button id="send-btn" title="Enviar mensagem">➤</button>
            </div>
            <footer>
                <button id="disconnect-btn">Encerrar Sessão</button>
            </footer>
        </main>
    </div>
    <!-- Scripts modulares para melhor organização -->
    <script src="crypto-handler.js"></script>
    <script src="webrtc-handler.js"></script>
    <script src="popup.js"></script>
</body>
</html>`,
      "popup.css": `:root {
    --primary-color: #007bff;
    --primary-hover: #0056b3;
    --danger-color: #dc3545;
    --danger-hover: #c82333;
    --light-gray: #f8f9fa;
    --medium-gray: #e9ecef;
    --dark-gray: #6c757d;
    --sent-bg: #dcf8c6;
    --received-bg: #ffffff;
    --border-color: #dee2e6;
}

html {
    width: 380px;
    height: 600px;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    width: 100%;
    height: 100%;
    margin: 0;
    color: #212529;
    display: flex;
    flex-direction: column;
}

.hidden { display: none !important; }

#app { 
    display: flex; 
    flex-direction: column; 
    height: 100%;
    flex: 1;
    overflow: hidden;
}

.app-header {
    background-color: var(--light-gray);
    padding: 10px 15px;
    border-bottom: 1px solid var(--border-color);
    flex-shrink: 0;
}

.app-header h1 {
    font-size: 16px;
    margin: 0 0 5px 0;
    text-align: center;
}

#connection-status {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 11px;
    color: var(--dark-gray);
}

#my-id-display span {
    font-weight: bold;
    color: #333;
    cursor: pointer;
    background-color: var(--medium-gray);
    padding: 2px 4px;
    border-radius: 3px;
}

#peer-status::before {
    content: '⚫';
    margin-right: 5px;
    font-size: 12px;
}
#peer-status.online { color: #28a745; }
#peer-status.online::before { content: '🟢'; }
#peer-status.offline { color: var(--danger-color); }
#peer-status.offline::before { content: '🔴'; }

main { 
    padding: 15px; 
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

#setup-view {
    overflow-y: auto;
}

#setup-view p {
    font-size: 13px;
    color: var(--dark-gray);
    text-align: center;
    margin-top: 0;
}

.input-group, #input-area {
    display: flex;
    gap: 8px;
    flex-shrink: 0;
}

input[type="text"] {
    flex-grow: 1;
    padding: 8px;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    font-size: 14px;
}
input[type="text"]:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

button {
    padding: 8px 12px;
    border: none;
    background-color: var(--primary-color);
    color: white;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    transition: background-color 0.2s;
}
button:hover { background-color: var(--primary-hover); }

#disconnect-btn { background-color: var(--danger-color); }
#disconnect-btn:hover { background-color: var(--danger-hover); }

#chat-view footer {
    padding-top: 10px;
    flex-shrink: 0;
}

#messages {
    flex: 1;
    height: auto;
    min-height: 0;
    border: 1px solid var(--border-color);
    background-color: var(--light-gray);
    padding: 10px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 15px;
}

.message {
    padding: 8px 12px;
    border-radius: 12px;
    max-width: 80%;
    word-wrap: break-word;
    box-shadow: 0 1px 1px rgba(0,0,0,0.05);
}
.message.sent {
    background-color: var(--sent-bg);
    align-self: flex-end;
    border-bottom-right-radius: 2px;
}
.message.received {
    background-color: var(--received-bg);
    align-self: flex-start;
    border: 1px solid var(--medium-gray);
    border-bottom-left-radius: 2px;
}
.message img {
    max-width: 100%;
    border-radius: 8px;
    display: block;
}

.file-label {
    cursor: pointer;
    font-size: 20px;
    padding: 5px;
    display: flex;
    align-items: center;
    justify-content: center;
}

#send-btn {
    font-size: 18px;
    padding: 0 12px;
}`,
      "crypto-handler.js": `// extension/crypto-handler.js

/**
 * Módulo para encapsular toda a lógica de criptografia usando a Web Crypto API.
 * Garante que as operações criptográficas sejam seguras e isoladas.
 */
const CryptoHandler = {
    ecdhParams: { name: 'ECDH', namedCurve: 'P-256' },
    aesParams: { name: 'AES-GCM', length: 256 },

    /**
     * Gera um par de chaves criptográficas (pública e privada) para a troca de chaves Diffie-Hellman.
     * @returns {Promise<CryptoKeyPair>} Um par de chaves.
     */
    async generateKeys() {
        return await window.crypto.subtle.generateKey(
            this.ecdhParams,
            true, // Chave extraível para exportação da chave pública
            ['deriveKey']
        );
    },

    /**
     * Deriva uma chave secreta compartilhada usando nossa chave privada e a chave pública do par.
     * @param {CryptoKey} privateKey - Nossa chave privada ECDH.
     * @param {JsonWebKey} publicKeyJwk - A chave pública do par no formato JWK.
     * @returns {Promise<CryptoKey>} A chave AES-GCM compartilhada.
     */
    async deriveSharedSecret(privateKey, publicKeyJwk) {
        const importedPublicKey = await window.crypto.subtle.importKey(
            'jwk',
            publicKeyJwk,
            this.ecdhParams,
            true,
            []
        );

        return await window.crypto.subtle.deriveKey(
            { name: 'ECDH', public: importedPublicKey },
            privateKey,
            this.aesParams,
            false, // A chave derivada não precisa ser extraível.
            ['encrypt', 'decrypt']
        );
    },

    /**
     * Criptografa dados (texto ou arquivo) usando a chave secreta compartilhada.
     * @param {CryptoKey} sharedKey - A chave AES-GCM.
     * @param {string|ArrayBuffer} data - Os dados a serem criptografados.
     * @returns {Promise<ArrayBuffer>} Um buffer contendo o IV + dados criptografados.
     */
    async encrypt(sharedKey, data) {
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const dataBuffer = (typeof data === 'string') 
            ? new TextEncoder().encode(data)
            : data;

        const encryptedData = await window.crypto.subtle.encrypt(
            { name: 'AES-GCM', iv: iv },
            sharedKey,
            dataBuffer
        );

        const resultBuffer = new Uint8Array(iv.length + encryptedData.byteLength);
        resultBuffer.set(iv);
        resultBuffer.set(new Uint8Array(encryptedData), iv.length);
        
        return resultBuffer.buffer;
    },

    /**
     * Decriptografa dados recebidos usando a chave secreta compartilhada.
     * @param {CryptoKey} sharedKey - A chave AES-GCM.
     * @param {ArrayBuffer} encryptedBuffer - O buffer contendo IV + dados criptografados.
     * @returns {Promise<ArrayBuffer|null>} Os dados originais decriptografados ou null em caso de falha.
     */
    async decrypt(sharedKey, encryptedBuffer) {
        const iv = encryptedBuffer.slice(0, 12);
        const data = encryptedBuffer.slice(12);

        try {
            return await window.crypto.subtle.decrypt(
                { name: 'AES-GCM', iv: new Uint8Array(iv) },
                sharedKey,
                data
            );
        } catch (e) {
            console.error("❌ Falha na decriptografia.", e);
            return null;
        }
    },

    /**
     * Exporta uma chave pública para o formato JSON Web Key (JWK).
     * @param {CryptoKey} key - A chave pública a ser exportada.
     * @returns {Promise<JsonWebKey>} A chave no formato JWK.
     */
    async exportPublicKey(key) {
        return await window.crypto.subtle.exportKey('jwk', key);
    }
};`,
      "webrtc-handler.js": `// extension/webrtc-handler.js

/**
 * Cria e gerencia uma instância de RTCPeerConnection, abstraindo a complexidade do WebRTC.
 * @param {function} onDataChannelMessage - Callback para quando uma mensagem é recebida.
 * @param {function} onConnectionStateChange - Callback para mudanças no estado da conexão.
 * @param {function} onIceCandidate - Callback para quando um candidato ICE é gerado.
 * @returns {object} Um objeto com métodos para controlar a conexão WebRTC.
 */
function WebRTCHandler(onDataChannelMessage, onConnectionStateChange, onIceCandidate, onDataChannelOpen) {
    const peerConnection = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });
    
    let dataChannel;

    peerConnection.onicecandidate = event => {
        if (event.candidate) {
            onIceCandidate(event.candidate);
        }
    };

    peerConnection.onconnectionstatechange = () => {
        onConnectionStateChange(peerConnection.connectionState);
    };
    
    peerConnection.oniceconnectionstatechange = () => {
        if (peerConnection.iceConnectionState === 'connected' || peerConnection.iceConnectionState === 'completed') {
            onConnectionStateChange('connected');
        }
    };

    peerConnection.ondatachannel = event => {
        dataChannel = event.channel;
        setupDataChannelEvents();
    };

    function setupDataChannelEvents() {
        dataChannel.binaryType = 'arraybuffer';
        dataChannel.onmessage = event => onDataChannelMessage(event.data);
        
        const onOpenHandler = () => {
            console.log('✅ Canal de dados P2P aberto!');
            if (onDataChannelOpen) onDataChannelOpen();
        };

        if (dataChannel.readyState === 'open') {
            onOpenHandler();
        } else {
            dataChannel.onopen = onOpenHandler;
        }
        
        dataChannel.onclose = () => console.log('❌ Canal de dados P2P fechado!');
    }

    function waitForIceGathering() {
        return new Promise(resolve => {
            if (peerConnection.iceGatheringState === 'complete') {
                resolve(peerConnection.localDescription);
                return;
            }

            let timeoutId;
            const done = () => {
                peerConnection.removeEventListener('icegatheringstatechange', checkState);
                peerConnection.removeEventListener('icecandidate', checkCandidate);
                clearTimeout(timeoutId);
                resolve(peerConnection.localDescription);
            };

            const checkState = () => {
                if (peerConnection.iceGatheringState === 'complete') done();
            };
            const checkCandidate = (event) => {
                if (!event.candidate) done();
            };

            peerConnection.addEventListener('icegatheringstatechange', checkState);
            peerConnection.addEventListener('icecandidate', checkCandidate);
            
            timeoutId = setTimeout(done, 3000);
        });
    }

    return {
        async createOffer() {
            dataChannel = peerConnection.createDataChannel('secure-chat-channel');
            setupDataChannelEvents();
            
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);
            return offer;
        },
        
        async createOfferWithGathering() {
            dataChannel = peerConnection.createDataChannel('secure-chat-channel');
            setupDataChannelEvents();
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);
            return await waitForIceGathering();
        },

        async createAnswer(offer) {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            return answer;
        },

        async createAnswerWithGathering(offer) {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            return await waitForIceGathering();
        },

        async handleAnswer(answer) {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
        },

        async addIceCandidate(candidate) {
            try {
                await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (e) {
                console.error('Erro ao adicionar candidato ICE recebido', e);
            }
        },

        send(data) {
            if (dataChannel && dataChannel.readyState === 'open') {
                dataChannel.send(data);
            } else {
                console.error('Tentativa de envio, mas o canal de dados não está aberto.');
                throw new Error('Canal de dados não está aberto.');
            }
        },

        close() {
            if (peerConnection) {
                peerConnection.close();
            }
        }
    };
}`,
      "popup.js": `// extension/popup.js

document.addEventListener('DOMContentLoaded', () => {
    // const SIGNALING_SERVER_URL = 'stun.l.google.com:19302';

    // --- Elementos da UI ---
    const myIdDisplaySpan = document.querySelector('#my-id-display span');
    const peerStatus = document.getElementById('peer-status');
    const editIdBtn = document.getElementById('edit-id-btn');
    const setupView = document.getElementById('setup-view');
    const chatView = document.getElementById('chat-view');
    const peerIdInput = document.getElementById('peer-id-input');
    const connectBtn = document.getElementById('connect-btn');
    const messagesDiv = document.getElementById('messages');
    const messageInput = document.getElementById('message-input');
    const sendBtn = document.getElementById('send-btn');
    const disconnectBtn = document.getElementById('disconnect-btn');
    const imageInput = document.getElementById('image-input');
    const contactNicknameInput = document.getElementById('contact-nickname');
    const saveContactBtn = document.getElementById('save-contact-btn');
    const contactsList = document.getElementById('contacts-list');
    const contactIdToSaveInput = document.getElementById('contact-id-to-save');
    const pinBtn = document.getElementById('pin-btn');
    const conversationInfo = document.getElementById('conversation-info');
    
    const connectionModeSelect = document.getElementById("connection-mode");
    const autoModeUi = document.getElementById("auto-mode-ui");
    const manualModeUi = document.getElementById("manual-mode-ui");
    const createManualOfferBtn = document.getElementById("create-manual-offer-btn");
    const manualCodeDisplay = document.getElementById("manual-code-display");
    const manualCodeInput = document.getElementById("manual-code-input");
    const processManualCodeBtn = document.getElementById("process-manual-code-btn");
    const signalingUrlInput = document.getElementById("signaling-url-input");

    // --- Estado da Aplicação ---
    let myId = null;
    let peerId = null;
    let signalingSocket = null;
    let keyPair = null;
    let sharedSecretKey = null;
    let rtcHandler = null;

    // =================================================================================
    // 1. INICIALIZAÇÃO E SINALIZAÇÃO (WEBSOCKET)
    // =================================================================================

    function connectToSignaling() {
        if (connectionModeSelect.value === 'manual') return;
        
        let baseUrl = signalingUrlInput.value.trim();

        // Se estiver vazio ou for o endereço STUN (que não é WebSocket), usa localhost
        if (!baseUrl || baseUrl.includes("stun.l.google.com")) {
            baseUrl = "ws://localhost:8080";
            signalingUrlInput.value = baseUrl;
        }

        if (!baseUrl.startsWith("ws://") && !baseUrl.startsWith("wss://")) {
            baseUrl = \`ws://\${baseUrl}\`;
            signalingUrlInput.value = baseUrl;
        }
        chrome.storage.local.set({ signalingUrl: baseUrl });

        chrome.storage.local.get(['customId'], (result) => {
            let url = baseUrl;
            const separator = url.includes('?') ? '&' : '?';
            if (result.customId) {
                url += \`\${separator}id=\${encodeURIComponent(result.customId)}\`;
            }

            signalingSocket = new WebSocket(url);
            signalingSocket.onmessage = handleSignalingMessage;
            signalingSocket.onopen = () => console.log('🔗 Conectado ao servidor de sinalização.');
            signalingSocket.onclose = () => {
                console.log('🔌 Desconectado do servidor de sinalização.');
                displaySystemMessage('Desconectado do servidor. Tentando reconectar...', 'warning');
                updatePeerStatus('Offline', 'offline');
                if (connectionModeSelect.value === 'auto')
                    setTimeout(connectToSignaling, 3000);
            };
            signalingSocket.onerror = () => {
                console.error('❌ Erro no WebSocket.');
                displaySystemMessage('Falha ao conectar ao servidor. Verifique se ele está rodando e a URL está correta.', 'warning');
            };
        });
    }

    function sendSignalingMessage(type, payload) {
        if (signalingSocket && signalingSocket.readyState === WebSocket.OPEN && peerId) {
            signalingSocket.send(JSON.stringify({ target: peerId, type, payload }));
        }
    }

    async function handleSignalingMessage(event) {
        const msg = JSON.parse(event.data);

        switch (msg.type) {
            case 'your-id':
                myId = msg.id;
                myIdDisplaySpan.textContent = myId;
                break;
            
            case 'key-exchange':
                peerId = msg.from;
                initializeWebRTCHandler();
                keyPair = await CryptoHandler.generateKeys();
                sharedSecretKey = await CryptoHandler.deriveSharedSecret(keyPair.privateKey, msg.payload.publicKey);
                
                const myPublicKey = await CryptoHandler.exportPublicKey(keyPair.publicKey);
                sendSignalingMessage('key-exchange-reply', { publicKey: myPublicKey });
                break;

            case 'key-exchange-reply':
                sharedSecretKey = await CryptoHandler.deriveSharedSecret(keyPair.privateKey, msg.payload.publicKey);
                const offer = await rtcHandler.createOffer();
                sendSignalingMessage('webrtc-offer', offer);
                break;

            case 'webrtc-offer':
                const answer = await rtcHandler.createAnswer(msg.payload);
                sendSignalingMessage('webrtc-answer', answer);
                break;

            case 'webrtc-answer':
                await rtcHandler.handleAnswer(msg.payload);
                break;

            case 'ice-candidate':
                if (rtcHandler) {
                    await rtcHandler.addIceCandidate(msg.payload);
                }
                break;
        }
    }

    // =================================================================================
    // 2. LÓGICA P2P (WEBRTC) E CRIPTOGRAFIA
    // =================================================================================

    // --- Lógica Manual (Sem Servidor) ---
    async function createManualOffer() {
        displaySystemMessage("Gerando código de convite... Aguarde.", "info");
        initializeWebRTCHandler();
        keyPair = await CryptoHandler.generateKeys();
        const myPublicKey = await CryptoHandler.exportPublicKey(keyPair.publicKey);
        
        // Cria oferta e espera coletar todos os candidatos ICE
        const offer = await rtcHandler.createOfferWithGathering();
        
        const codeData = {
            type: 'offer',
            sdp: offer,
            publicKey: myPublicKey
        };
        
        const codeString = btoa(JSON.stringify(codeData));
        manualCodeDisplay.value = codeString;
        manualCodeDisplay.style.display = 'block';
        manualCodeDisplay.select();
        displaySystemMessage("Copie o código acima e envie para seu contato.", "success");
    }

    async function processManualCode() {
        const codeString = manualCodeInput.value.trim();
        if (!codeString) return;

        try {
            const data = JSON.parse(atob(codeString));
            
            if (data.type === 'offer') {
                // Recebi um convite, vou gerar resposta
                displaySystemMessage("Processando convite...", "info");
                initializeWebRTCHandler();
                keyPair = await CryptoHandler.generateKeys();
                
                // Deriva chave secreta
                sharedSecretKey = await CryptoHandler.deriveSharedSecret(keyPair.privateKey, data.publicKey);
                
                // Gera resposta WebRTC
                const answer = await rtcHandler.createAnswerWithGathering(data.sdp);
                const myPublicKey = await CryptoHandler.exportPublicKey(keyPair.publicKey);

                const responseData = {
                    type: 'answer',
                    sdp: answer,
                    publicKey: myPublicKey
                };

                const responseString = btoa(JSON.stringify(responseData));
                manualCodeDisplay.value = responseString;
                manualCodeDisplay.style.display = 'block';
                manualCodeDisplay.select();
                displaySystemMessage("Convite aceito! Envie o código acima de volta para quem te convidou.", "success");

            } else if (data.type === 'answer') {
                // Recebi a resposta do meu convite
                if (!rtcHandler || !keyPair) {
                    displaySystemMessage("Erro: Sessão perdida. Mantenha a janela aberta.", "error");
                    return;
                }
                displaySystemMessage("Finalizando conexão...", "info");
                sharedSecretKey = await CryptoHandler.deriveSharedSecret(keyPair.privateKey, data.publicKey);
                await rtcHandler.handleAnswer(data.sdp);
            }
        } catch (e) {
            console.error(e);
            displaySystemMessage("Código inválido.", "error");
        }
    }

    function initializeWebRTCHandler() {
        rtcHandler = WebRTCHandler(
            handleDataChannelMessage,
            handleConnectionStateChange,
            (candidate) => sendSignalingMessage('ice-candidate', candidate),
            activateChat
        );
    }

    async function handleDataChannelMessage(encryptedData) {
        const decryptedData = await CryptoHandler.decrypt(sharedSecretKey, encryptedData);
        if (!decryptedData) {
            displaySystemMessage('Falha ao descriptografar mensagem recebida.', 'error');
            return;
        }

        try {
            const payloadString = new TextDecoder().decode(decryptedData);
            const payload = JSON.parse(payloadString);

            if (payload.type === 'text') {
                displayMessage(payload.content, "received");
            } else if (payload.type === 'file' && payload.content) {
                const byteString = atob(payload.content);
                const ab = new ArrayBuffer(byteString.length);
                const ia = new Uint8Array(ab);
                for (let i = 0; i < byteString.length; i++) {
                    ia[i] = byteString.charCodeAt(i);
                }
                const blob = new Blob([ab], { type: payload.mimeType });
                displayImage(URL.createObjectURL(blob), "received");
            }
        } catch (e) {
            console.error("Erro ao processar payload recebido:", e);
            displaySystemMessage("Recebida mensagem em formato inválido.", "warning");
        }
    }

    function handleConnectionStateChange(state) {
        console.log('Estado da conexão WebRTC:', state);
        if (state === 'connected') {
            updatePeerStatus('Conectado (Seguro)', 'online');
            if (myId && peerId) {
                conversationInfo.textContent = \`\${myId} <--> \${peerId}\`;
                conversationInfo.style.display = 'block';
            } else {
                conversationInfo.style.display = 'none';
            }
            activateChat();
        } else if (['disconnected', 'failed', 'closed'].includes(state)) {
            resetState();
        }
    }

    // =================================================================================
    // 3. AÇÕES E MANIPULAÇÃO DA UI
    // =================================================================================

    function loadContacts() {
        chrome.storage.local.get(['contacts'], (result) => {
            const contacts = result.contacts || [];
            renderContacts(contacts);
        });
    }

    function saveContact() {
        const id = contactIdToSaveInput.value.trim() || peerIdInput.value.trim();
        const nickname = contactNicknameInput.value.trim() || id;
        
        if (!id) {
            displaySystemMessage('Digite um ID para salvar.', 'error');
            return;
        }

        chrome.storage.local.get(['contacts'], (result) => {
            // Garante que contacts seja um array
            const contacts = Array.isArray(result.contacts) ? result.contacts : [];
            const existingIndex = contacts.findIndex(c => c.id === id);
            if (existingIndex >= 0) {
                contacts[existingIndex].nickname = nickname;
            } else {
                contacts.push({ id, nickname });
            }
            
            chrome.storage.local.set({ contacts }, () => {
                if (chrome.runtime.lastError) {
                    console.error("Erro ao salvar contato:", chrome.runtime.lastError);
                    displaySystemMessage("Erro ao salvar contato.", "error");
                } else {
                    loadContacts();
                    contactNicknameInput.value = '';
                    contactIdToSaveInput.value = '';
                    displaySystemMessage("Contato salvo com sucesso!", "success");
                }
            });
        });
    }

    function deleteContact(id) {
        chrome.storage.local.get(['contacts'], (result) => {
            let contacts = result.contacts || [];
            contacts = contacts.filter(c => c.id !== id);
            chrome.storage.local.set({ contacts }, () => loadContacts());
        });
    }

    function renderContacts(contacts) {
        contactsList.innerHTML = '';
        if (contacts.length === 0) {
            contactsList.innerHTML = '<li style="color: #999; font-size: 12px; text-align: center;">Nenhum contato salvo.</li>';
            return;
        }
        contacts.forEach(contact => {
            const li = document.createElement('li');
            li.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 5px; border-bottom: 1px solid #f0f0f0;';
            li.innerHTML = \`<span style="cursor: pointer; font-weight: 500; flex-grow: 1;" title="\${contact.id}">\${contact.nickname}</span>
                            <button class="delete-btn" style="padding: 2px 6px; font-size: 12px; background: #dc3545; color: white; border: none; border-radius: 3px; cursor: pointer;">×</button>\`;
            li.querySelector('span').onclick = () => { peerIdInput.value = contact.id; };
            li.querySelector('.delete-btn').onclick = (e) => { e.stopPropagation(); deleteContact(contact.id); };
            contactsList.appendChild(li);
        });
    }

    async function startConnection() {
        const id = peerIdInput.value.trim();
        if (!id) {
            displaySystemMessage('Por favor, insira o ID do outro usuário.', 'error');
            return;
        }
        peerId = id;

        initializeWebRTCHandler();
        keyPair = await CryptoHandler.generateKeys();
        const myPublicKey = await CryptoHandler.exportPublicKey(keyPair.publicKey);
        sendSignalingMessage('key-exchange', { publicKey: myPublicKey });
    }

    async function sendMessage() {
        const text = messageInput.value;
        if (!text) return;
        if (!sharedSecretKey) {
            displaySystemMessage("Erro: Chave de criptografia não estabelecida.", "error");
            return;
        }

        try {
            const payload = { type: 'text', content: text };
            const payloadString = JSON.stringify(payload);
            const encryptedMessage = await CryptoHandler.encrypt(sharedSecretKey, payloadString);
            rtcHandler.send(encryptedMessage);
            
            displayMessage(text, 'sent');
            messageInput.value = '';
        } catch (error) {
            console.error("Falha ao enviar mensagem:", error);
            displaySystemMessage("Falha ao enviar a mensagem.", "error");
        }
    }

    function sendFile(file) {
        if (!file) return;
        if (!sharedSecretKey) {
            displaySystemMessage("Erro: Chave de criptografia não estabelecida.", "error");
            return;
        }

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const base64Content = e.target.result.split(',')[1];
                const payload = {
                    type: 'file',
                    content: base64Content,
                    mimeType: file.type,
                    name: file.name
                };
                const payloadString = JSON.stringify(payload);
                const encryptedFile = await CryptoHandler.encrypt(sharedSecretKey, payloadString);
                rtcHandler.send(encryptedFile);
                displayImage(URL.createObjectURL(file), "sent");
            } catch (error) {
                console.error("Falha ao enviar arquivo:", error);
                displaySystemMessage("Falha ao enviar o arquivo.", "error");
            }
        };
        reader.readAsDataURL(file);
    }

    function resetState() {
        if (rtcHandler) rtcHandler.close();
        
        updatePeerStatus('Offline', 'offline');
        chatView.classList.add('hidden');
        setupView.classList.remove('hidden');
        messagesDiv.innerHTML = '';
        peerIdInput.value = '';
        conversationInfo.textContent = '';
        conversationInfo.style.display = 'none';

        peerId = null;
        keyPair = null;
        sharedSecretKey = null;
        rtcHandler = null;
    }

    function updatePeerStatus(text, className) {
        peerStatus.textContent = text;
        peerStatus.className = className;
    }

    function displayMessage(text, className) {
        const el = document.createElement('div');
        el.className = \`message \${className}\`;
        el.textContent = text;
        messagesDiv.appendChild(el);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }

    function displayImage(url, className) {
        const el = document.createElement('div');
        el.className = \`message \${className}\`;
        const img = document.createElement('img');
        img.src = url;
        el.appendChild(img);
        messagesDiv.appendChild(el);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }

    function displaySystemMessage(text, type = 'info') {
        console.log(\`SYSTEM [\${type}]: \${text}\`);
        if (chatView.classList.contains('hidden')) {
            const setupMessages = document.getElementById('setup-messages');
            if (setupMessages) {
                setupMessages.innerHTML = '';
                const el = document.createElement('div');
                el.className = \`message system \${type}\`;
                el.textContent = text;
                el.style.margin = '0 auto';
                setupMessages.appendChild(el);
            }
        } else {
            const el = document.createElement('div');
            el.className = \`message system \${type}\`;
            el.textContent = text;
            messagesDiv.appendChild(el);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }
    }

    function activateChat() {
        // Garante que a troca de view só aconteça uma vez
        if (chatView.classList.contains('hidden')) {
            setupView.classList.add('hidden');
            chatView.classList.remove('hidden');
            messageInput.focus();

            if (manualCodeDisplay) {
                manualCodeDisplay.value = '';
                manualCodeDisplay.style.display = 'none';
            }
            if (manualCodeInput) manualCodeInput.value = '';
        }
    }

    // --- Lógica de Fixar Janela (Pop-out) ---
    const isPinned = window.location.search.includes('pinned=true');
    
    if (isPinned) {
        pinBtn.textContent = '❌';
        pinBtn.title = 'Desfixar (Fechar janela)';
        // Tenta prevenir fechamento acidental
        window.onbeforeunload = (e) => {
            e.preventDefault();
            e.returnValue = '';
        };
    }

    pinBtn.addEventListener('click', () => {
        if (isPinned) {
            window.close();
        } else {
            chrome.windows.create({
                url: chrome.runtime.getURL('popup.html?pinned=true'),
                type: 'popup',
                width: 380,
                height: 600
            });
        }
    });

    // --- Alternar Modos ---
    connectionModeSelect.addEventListener('change', (e) => {
        if (e.target.value === 'manual') {
            autoModeUi.classList.add('hidden');
            manualModeUi.classList.remove('hidden');
            if (signalingSocket) signalingSocket.close();
        } else {
            autoModeUi.classList.remove('hidden');
            manualModeUi.classList.add('hidden');
            connectToSignaling();
        }
    });

    createManualOfferBtn.addEventListener('click', createManualOffer);
    processManualCodeBtn.addEventListener('click', processManualCode);
    manualCodeDisplay.addEventListener('click', () => manualCodeDisplay.select());
    
    // --- Alterar ID Personalizado ---
    editIdBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const currentId = myId || '';
        const newId = prompt("Defina seu ID Personalizado (deixe vazio para aleatório):", currentId);
        
        if (newId !== null) {
            const trimmedId = newId.trim();
            if (trimmedId) {
                chrome.storage.local.set({ customId: trimmedId }, () => {
                    displaySystemMessage(\`ID definido. Reconectando...\`, 'info');
                    if (signalingSocket) signalingSocket.close();
                });
            } else {
                chrome.storage.local.remove('customId', () => {
                    displaySystemMessage("Voltando para ID aleatório...", 'info');
                    if (signalingSocket) signalingSocket.close();
                });
            }
        }
    });

    // --- Event Listeners ---
    connectBtn.addEventListener('click', startConnection);
    if(saveContactBtn) saveContactBtn.addEventListener('click', saveContact);
    sendBtn.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', (e) => e.key === 'Enter' && sendMessage());
    disconnectBtn.addEventListener('click', resetState);
    imageInput.addEventListener('change', (e) => e.target.files[0] && sendFile(e.target.files[0]));
    myIdDisplaySpan.addEventListener('click', () => {
        if (!myId) return;
        navigator.clipboard.writeText(myId).then(() => {
            const originalText = myIdDisplaySpan.textContent;
            myIdDisplaySpan.textContent = 'Copiado!';
            setTimeout(() => myIdDisplaySpan.textContent = originalText, 1500);
        });
    });

    // --- Inicialização da Aplicação ---
    chrome.storage.local.get(['signalingUrl'], (result) => {
        // Carrega a URL salva, exceto se for o endereço STUN incorreto (correção de legado)
        if (result.signalingUrl && !result.signalingUrl.includes("stun.l.google.com")) {
            signalingUrlInput.value = result.signalingUrl;
        } else {
            signalingUrlInput.value = 'ws://localhost:8080';
        }
        connectToSignaling();
    });
    updatePeerStatus('Offline', 'offline');
    loadContacts();
});`,
    },
  },
};

/**
 * Função recursiva para criar diretórios e arquivos.
 * @param {string} basePath - O caminho base onde a estrutura será criada.
 * @param {object} structure - O objeto que define os arquivos e diretórios.
 */
function createStructure(basePath, structure) {
  Object.keys(structure).forEach((name) => {
    const currentPath = path.join(basePath, name);
    const content = structure[name];

    if (typeof content === "object" && content !== null && !content.base64) {
      // É um diretório, cria a pasta e chama a função recursivamente.
      if (!fs.existsSync(currentPath)) {
        fs.mkdirSync(currentPath, { recursive: true });
      }
      console.log(`📁 Diretório criado: ${currentPath}`);
      createStructure(currentPath, content);
    } else {
      // É um arquivo (texto ou binário a partir de base64)
      const fileContent = content.base64
        ? Buffer.from(content.base64, "base64")
        : content;
      fs.writeFileSync(currentPath, fileContent, "utf8");
      console.log(`✅ Arquivo criado: ${currentPath}`);
    }
  });
}

// Inicia a criação a partir do diretório atual.
createStructure(".", projectStructure);

console.log(
  '\\n🚀 Estrutura do projeto "secure-p2p-chat" criada com sucesso, incluindo os ícones!',
);
console.log("\nPróximos passos:");
console.log(
  "1. Navegue até o diretório do servidor: cd secure-p2p-chat/server",
);
console.log("2. Instale as dependências: npm install");
console.log("3. Inicie o servidor: npm start");
console.log(
  '4. Carregue a pasta "secure-p2p-chat/extension" no seu navegador em chrome://extensions',
);
