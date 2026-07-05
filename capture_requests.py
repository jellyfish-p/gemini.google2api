#!/usr/bin/env python3
"""
Usage:
    python capture_requests.py <url> [--output-dir <dir>]

Opens a visible browser, renders the page, captures all network
requests/responses until the user closes the browser, then saves
everything to a local folder.
"""

import argparse
import asyncio
import json
import os
import sys
import time
from pathlib import Path
from urllib.parse import urlparse

from playwright.async_api import async_playwright


async def capture(url: str, output_dir: str):
    parsed = urlparse(url)
    domain = parsed.netloc.replace(":", "_")
    timestamp = time.strftime("%Y%m%d_%H%M%S")
    safe_url = domain if domain else "unknown"
    output_path = Path(output_dir) / f"{safe_url}_{timestamp}"
    output_path.mkdir(parents=True, exist_ok=True)

    entries = []
    lock = asyncio.Lock()

    async def on_response(response):
        req = response.request
        entry = {
            "index": len(entries),
            "url": req.url,
            "method": req.method,
            "resource_type": req.resource_type,
            "request_headers": dict(req.headers),
            "response_status": response.status,
            "response_status_text": response.status_text,
            "response_headers": dict(response.headers),
        }

        if req.method in ("POST", "PUT", "PATCH"):
            try:
                post_data = await req.post_data()
                entry["request_body"] = post_data
            except Exception:
                entry["request_body"] = None

        try:
            body = await response.body()
            entry["response_body_b64"] = body.hex()
            entry["response_body_encoding"] = "hex"
        except Exception:
            entry["response_body_b64"] = None

        async with lock:
            entries.append(entry)

    async def on_request_failed(request):
        entry = {
            "index": len(entries),
            "url": request.url,
            "method": request.method,
            "resource_type": request.resource_type,
            "request_headers": dict(request.headers),
            "error": "Request failed",
            "response_status": None,
            "response_headers": None,
            "response_body_b64": None,
        }
        async with lock:
            entries.append(entry)

    print(f"Launching browser...")
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        context = await browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            ),
            viewport={"width": 1920, "height": 1080},
        )
        page = await context.new_page()

        page.on("response", on_response)
        page.on("requestfailed", on_request_failed)

        print(f"Navigating to: {url}")
        try:
            await page.goto(url, wait_until="domcontentloaded", timeout=60000)
        except Exception as e:
            print(f"Warning during navigation: {e}")

        print(f"\n  Browser is now visible.  Close the browser window to stop recording.\n")

        # Wait until the user closes the page or the entire browser
        page_closed = asyncio.get_event_loop().create_future()
        browser_disconnected = asyncio.get_event_loop().create_future()

        page.on("close", lambda: page_closed.set_result(True))
        browser.on("disconnected", lambda: browser_disconnected.set_result(True))

        await asyncio.wait(
            [page_closed, browser_disconnected],
            return_when=asyncio.FIRST_COMPLETED,
        )

        print(f"\nCaptured {len(entries)} requests.  Saving data...")

        # Save page content (best-effort, may fail if already closed)
        try:
            html_content = await page.content()
            (output_path / "page.html").write_text(html_content, encoding="utf-8")
        except Exception:
            print("  (page HTML unavailable after close)")

        try:
            screenshot_path = output_path / "screenshot.png"
            await page.screenshot(path=str(screenshot_path), full_page=True)
        except Exception:
            print("  (screenshot unavailable after close)")

        try:
            await browser.close()
        except Exception:
            pass

    # Save all entries to disk
    requests_dir = output_path / "requests"
    requests_dir.mkdir(exist_ok=True)

    for entry in entries:
        index = entry["index"]
        parsed_url = urlparse(entry["url"])
        path_part = (parsed_url.path or "/").replace("/", "_").replace("\\", "_")
        if len(path_part) > 80:
            path_part = path_part[:80]
        domain_part = parsed_url.netloc.replace(":", "_")
        filename = f"{index:05d}_{domain_part}{path_part}"
        sanitized = "".join(c if c.isalnum() or c in "._- " else "_" for c in filename)
        if not sanitized:
            sanitized = f"request_{index:05d}"

        entry_path = requests_dir / f"{sanitized}.json"

        entry_for_disk = dict(entry)
        if entry_for_disk.get("response_body_b64"):
            try:
                raw = bytes.fromhex(entry_for_disk["response_body_b64"])
                entry_for_disk["response_body"] = raw.decode("utf-8", errors="replace")
                entry_for_disk["response_body_bytes"] = len(raw)
            except Exception:
                entry_for_disk["response_body"] = None
                entry_for_disk["response_body_bytes"] = 0
            del entry_for_disk["response_body_b64"]
            del entry_for_disk["response_body_encoding"]

        entry_path.write_text(
            json.dumps(entry_for_disk, indent=2, ensure_ascii=False),
            encoding="utf-8",
        )

    summary = []
    for entry in entries:
        summary.append({
            "index": entry["index"],
            "url": entry["url"],
            "method": entry["method"],
            "status": entry["response_status"],
            "resource_type": entry["resource_type"],
        })

    (output_path / "index.json").write_text(
        json.dumps(summary, indent=2, ensure_ascii=False), encoding="utf-8"
    )

    print(f"\nAll data saved to: {output_path.resolve()}")
    print(f"  - page.html        (final rendered HTML)")
    print(f"  - screenshot.png   (full-page screenshot)")
    print(f"  - index.json       (summary of all requests)")
    print(f"  - requests/*.json  (detailed request/response data)")
    return output_path


def main():
    parser = argparse.ArgumentParser(
        description="Render a URL with a full browser and capture all network traffic."
    )
    parser.add_argument("url", help="The URL to visit")
    parser.add_argument(
        "--output-dir",
        "-o",
        default="captures",
        help="Output directory (default: captures)",
    )
    parser.add_argument(
        "--install",
        action="store_true",
        help="Install Playwright browsers and exit",
    )

    args = parser.parse_args()

    if args.install:
        print("Installing Playwright browsers...")
        os.system("playwright install chromium")
        return

    if not args.url.startswith(("http://", "https://")):
        args.url = "https://" + args.url

    asyncio.run(capture(args.url, args.output_dir))


if __name__ == "__main__":
    main()
