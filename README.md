# The Wheel of Chance

A small "spin the wheel" picker for when you can't decide. Type your choices into the list, press **Spin**, and the wheel slows to a stop on a random winner. The winner is announced below the wheel and confetti falls across the page.

Built with plain HTML, CSS and JavaScript. There are no frameworks, no build step and nothing to install.

## Features

- Add choices with the **Add** button or by pressing Enter, and remove them one at a time
- **Clear all** empties the list and turns the wheel back to its starting position
- Each choice gets its own coloured segment on the wheel, with a matching dot in the list
- The wheel picks the winner fairly: every choice has the same chance
- The spin starts fast and eases out slowly, then confetti falls
- Labels shrink and get shortened with "…" as you add more choices, and always read the right way up when the wheel stops
- The layout works on desktop and mobile (the columns stack on small screens)

## Running it

Download or clone the project, then open `index.html` in any modern browser (Chrome, Edge, Firefox or Safari).

If you'd rather use a local server, VS Code's **Live Server** extension works, or run this from the project folder:

```bash
python -m http.server 8000
```

Then go to <http://localhost:8000>.

> The fonts (Cormorant Garamond and Lora) load from Google Fonts. Without an internet connection the page uses a fallback serif font, and everything else still works.

## Customising

Change the settings at the top of `script.js`:

```js
const SETTINGS = {
  spinDuration: 6,            // seconds, 2–12 works well
  confettiAmount: "Generous", // "Light", "Generous" or "Lavish"
  palette: "Jewel",           // "Jewel", "Garden" or "Heritage"
};
```

To change the starter choices, edit the `entries` array in `script.js`. Set it to `[]` to start with an empty wheel.

## Project structure

```
random_selector/
├── index.html   Page structure
├── style.css    Design tokens, layout and component styles
├── script.js    Wheel drawing, spinning logic and confetti
└── README.md
```

## How it works

- The wheel is an SVG with one path per segment. Segments start at 12 o'clock and go clockwise.
- When you press Spin, the winner is chosen at random first. The wheel then works out how far it needs to rotate so that a spot inside the winner's segment ends up under the pointer, and adds several full turns on top.
- A CSS transition with a `cubic-bezier` curve animates the rotation. Once it finishes, the result appears.
- The confetti is drawn on a full-screen `<canvas>` with `requestAnimationFrame`.

## Credits

The design is based on the Classical design system. Icons are from [Lucide](https://lucide.dev).
