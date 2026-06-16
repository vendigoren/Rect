![Meet Rect](./images/meet-rect.png)
Howdy, welcome to **Rect**, a tool I built to solve a very specific, yet incredibly annoying problem in game development.

![What does it do?](./images/what-does-it-do.png)
The main objective of Rect is converting animations between `.gif` files and static spritesheets. Instead of dumping annoying `.json` metadata files next to your graphics, the app literally hides the frame slicing data inside the image pixels themselves. Your exported spritesheet carries its own config baked right in, keeping your project folders totally clean.

![What's the story behind it?](./images/story-behind-it.png)
I was originally looking for a straightforward way to implement `.gif` into various game engines. I quickly realized that these engines simply do not support the `.gif` format natively, they require spritesheets. After searching for a tool that could handle this conversion effortlessly (and smartly), I hit a wall. So, I went by the old programmer's rule: *If it doesn't exist, build it yourself.* 

That's exactly how the idea for Rect was born. I sat down and built this desktop application from scratch to ensure it's lightning-fast and fully hardware-accelerated. 

![What did you use to make it?](./images/what-did-you-use.png)
This desktop app is completely bloat-free. **Rust** handles the heavy lifting, giving you a tiny binary without Electron's heavy baggage. On the surface, **React** and **CSS** deliver a super responsive Single Page Application. **TypeScript** ties it all together, keeping development smooth and the runtime safe by typing all logic and DOM changes.

> [!NOTE]
> Rect is still in an early form of development, but it's already saving me hours of manual work. I have several exciting enhancements planned for the near future, including a built-in animation player, advanced padding controls, community spritesheet libraries, and more.

![How to use it?](./images/how-to-use.png)
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
./preview.bat

# Compile the standalone Windows .exe
./compile.bat
```
