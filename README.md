# Ctrl-Peek

> View full-resolution images that a website forces you to download — in-memory, without saving anything to disk. Just **Ctrl-click**.

A tiny Chrome / Edge / Brave extension (Manifest V3).

## The problem

Some sites serve their images with the HTTP header `Content-Disposition: attachment`. That header tells the browser *"don't display this, download it."* So clicking an image — even just to glance at it — drops a file in your Downloads folder instead of opening it.

I ran into this on a public asset-auction portal: the thumbnails were small, low-resolution previews, and the only way to see a photo at full resolution was to let it download. Tedious when you're browsing a dozen listings and just want to *look*.

Ctrl-Peek intercepts the click, fetches the image itself, and shows it full-size in an overlay — held in memory, never written to disk.

## Demo

![demo](demo.gif)

<!-- Record a ~3s clip: Ctrl-click a thumbnail, the full-res image pops up, Esc to close. -->

## Usage

1. Hold **Ctrl** (or **Cmd** on macOS) and click any image or thumbnail.
2. The full-resolution image opens centered in an overlay. The bottom shows its real pixel dimensions, so you can confirm it's the actual image and not the thumbnail.
3. Click anywhere or press **Esc** to close. The image is dropped from memory on close.

Normal (non-Ctrl) clicks are left untouched — if you actually want the file downloaded, click as usual.

## How it works

The key insight: `Content-Disposition: attachment` only controls what the *browser* does when it navigates to a URL. If you fetch the bytes yourself and render them, the header is irrelevant.

1. On Ctrl-click, the content script cancels the default action (the forced download / new-tab) and resolves the target URL — preferring the `<a href>` that wraps a thumbnail, since that's usually the full-resolution original.
2. It fetches the image. First it tries a normal `fetch()` from the page (works when the image is same-origin, which is the common case). If that's blocked by CORS, it hands the request to the extension's background service worker, which fetches with `host_permissions` and isn't subject to CORS.
3. The bytes become a `blob:` object URL (or a base64 `data:` URL via the background path) and go straight into an `<img>` inside the overlay.

An `<img>` only ever *decodes* bytes as an image — it never executes them — so a file carrying hidden code can't run through this path. On close, the `blob:` URL is revoked and the `<img>` `src` is cleared, so the bytes become eligible for garbage collection. Opening and closing many images doesn't accumulate memory.

## Limitations

- It assumes the full-resolution image is reachable from the clicked URL (typically the `<a href>` around the thumbnail). If a site triggers its download through JavaScript rather than a plain link, Ctrl-Peek grabs whatever URL it can find — possibly just the thumbnail. The URL it requests is logged to the console (`F12` → Console) so you can verify.
- It's intentionally small and general. It doesn't special-case every site; it handles the common *"link to an image that downloads"* pattern well.
- Image-decoder vulnerabilities (rare, e.g. the 2023 libwebp issue) apply to **any** image your browser renders, not just this extension — keep your browser up to date.

## Install (Chrome / Edge / Brave)

Not on the Web Store; load it unpacked:

1. Download or clone this repo.
2. Open `chrome://extensions`.
3. Enable **Developer mode** (top right).
4. Click **Load unpacked** and select the project folder.
5. Reload your target page and try Ctrl-click.

## Project structure

```
manifest.json   MV3 manifest: permissions and registration
content.js      intercepts Ctrl-click, resolves the URL, shows the overlay
background.js   CORS-free fetch fallback, returns the image as a data URL
content.css     overlay / lightbox styling
```

## Privacy & permissions

The extension requests broad host access because it can run on any site where you Ctrl-click. It does **not** send anything to any external server: a fetch happens only on your explicit Ctrl-click, only to the URL you clicked, and the result only ever lands in a local `<img>` that is discarded when you close the viewer. All the code lives in this repo and is short enough to read end to end.

## License

[MIT](LICENSE)
