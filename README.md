# Rect - Sprite Tool

<div align="center">
  <table>
    <tr>
      <!-- Left Side: Icon -->
      <td width="30%">
        <img src="https://i.imgur.com/GbZQ50q.png" alt="Preview" width="100%">
      </td>
      <!-- Right Side: YouTube -->
      <td width="70%">
        <a href="https://youtu.be/H-aKoU_3VFw">
          <img src="https://img.youtube.com/vi/H-aKoU_3VFw/maxresdefault.jpg" alt="Preview" width="100%">
        </a>
      </td>
    </tr>
  </table>
</div>

Howdy, welcome to **Rect**, a tool I built to solve a very specific, yet incredibly annoying problem in game development.

## What does it do?
It's actually pretty simple, so I'll explain it shortly:

This is a lean, zero-bloat desktop app built on **Tauri**, meaning you get a tiny binary without the heavy Electron baggage. The frontend spins up a snappy **React SPA** powered by **Next.js** and its modern App Router. We keep the DX smooth and the runtime safe by strictly typing all business logic and DOM manipulations in **TypeScript**. For the heavy lifting under the hood, a low-level **Rust** backend handles the OS integrations and renders the UI straight through native WebView2 for maximum performance. The main gig here is converting animations between `.gif` files and Spritesheets, but the real magic is the built-in grid configuration Steganography. Instead of dumping annoying .json metadata files next to your graphics, the app literally hides the frame slicing data inside the image pixels themselves. Your exported spritesheet carries its own config baked right in, keeping your project folders totally clean.

### The coolest part?
Sick of manually writing down grid data? This app uses a custom Steganography algorithm to secretly encode the configuration into the RGB channels of the first pixels on export. Loading it back instantly decodes and snaps the grid. No external metadata needed-pure, self-describing images ready for sharing, have fun folks!

## Why did I make this?
I was originally looking for a straightforward way to implement `.gif` into various game engines. I quickly realized that these engines simply do not support the `.gif` format natively, they require sprite sheets. After searching for a tool that could handle this conversion effortlessly (and smartly), I hit a wall. So, I went by the old programmer's rule: *If it doesn't exist, build it yourself.* 

That's exactly how the idea for Rect was born. I sat down and built this desktop application from scratch to ensure it's lightning-fast and fully hardware-accelerated. 

> [!NOTE]
> Rect is still in an early form of development, but it's already saving me hours of manual work. I have several exciting enhancements planned for the near future, including a built-in animation player, advanced padding controls, community spritesheet libraries, and more.

## How to use it?
It's designed to be as dummy-proof as possible:
1. Open the app and drop your `.gif` into the **Convert** tab.
2. The app will generate a perfect grid layout. Click **Generate Spritesheet**.
3. *Want to cut it up into smaller portions later?* Drop that generated PNG into the **Split** tab.
4. The steganography algorithm will automatically detect the exact grid you used earlier.
5. Have fun with Grid Layout and Package Division if you want to.
6. Hit **Generate Packages** and download your perfectly sliced ZIP file!

> [!TIP]
> If you want to poke around the code or run it locally:
```bash
# Start the local development server (Hot-Reload)
./view.bat

# Compile the standalone Windows .exe
./compile.bat
```
