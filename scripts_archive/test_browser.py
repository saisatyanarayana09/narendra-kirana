import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        errors = []
        page.on("pageerror", lambda err: errors.append(err.message))
        page.on("console", lambda msg: errors.append(msg.text) if msg.type == "error" else None)
        
        await page.goto("http://localhost:5173/owner/products")
        await page.wait_for_timeout(3000)
        
        print("Captured Errors:")
        for e in errors:
            print(e)
            
        await browser.close()

asyncio.run(main())
