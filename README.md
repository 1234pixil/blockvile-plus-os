# Blockvile Plus OS 3.1

A HyperOS-style operating system that runs in any modern browser. It has Phone, Tablet and Laptop modes, 22 apps, a real file system and a terminal, and it works offline.

## Start it
- **Quick:** double-click `index.html`.
- **Best:** double-click `start-windows.bat` (Windows) or run `./start-mac-linux.sh` (Mac/Linux). These need Python and open `http://localhost:8080`. Running it this way turns on the offline cache and lets you install it as an app.
- **Phone or tablet:** upload the folder to a free host such as GitHub Pages or Netlify. Open it in your browser and choose **Add to Home screen**.

## Three device modes
| Mode | Feels like |
|---|---|
| 📱 Phone | Android/HyperOS: home screen, dock, gesture bar, swipe-down panels, rotate to landscape |
| 📲 Tablet | Android tablet: split-screen for the two most recent apps, side panels |
| 💻 Laptop | macOS/Windows: menu bar, dock/taskbar, start launcher, draggable/resizable windows, window snapping, right-click menus |

## System features
- **Spotlight search** (`Ctrl+K`) finds apps, files, settings and actions. You can also type a sum like `12*7`, or search the web.
- **Control Centre** has Wi-Fi, data, brightness, volume, Bluetooth, dark mode, airplane mode, torch, Do Not Disturb, night light, battery saver, rotate, mode tiles, a power button and **Exit OS**.
- **Notifications** use heads-up banners and app icon badges. They also show on the lock screen, and tapping one opens its app. Do Not Disturb silences them.
- **Lock screen** has an optional PIN, auto-lock after a set idle time, plus torch and camera shortcuts.
- **Power menu** has Lock, Sleep, Restart, Shut down and Exit.
- **Multitasking:** recents/app switcher, Back and Home. Gestures are swipe up for home and a longer swipe up for recents.
- **Windows (laptop):** drag a window to the left or right edge to snap it to half the screen, or to the top to maximise. `Alt+arrow keys` also snap. You can also minimise, maximise and resize.
- **Personalise:** dark/light or follow system, 7 accent colours, 4 wallpapers, or your own photo as wallpaper.
- **Accessibility:** large text, reduce motion and high contrast.
- **Storage:**
  - Files, notes, contacts and so on are saved in your browser's storage.
  - Photos, music and recordings are kept in your browser's database.
- **Blockvile Store** (Play-Store-style):
  - Tabs for For you, Top charts (ranked by what you open most), Categories and Library, plus search.
  - App detail pages show size, permissions and features, with an install progress bar and an "installed" notification.
  - Install extra apps: **2048**, **Tic-Tac-Toe** (with an unbeatable AI) and **Converter**.
  - **Add any website as an app** from the Library tab.
  - Right-click (or long-press) any app to pin it to the dock or uninstall it.
- **Cloud Music:** stream SoundCloud tracks, playlists and artists with SoundCloud's official player.
  - Paste a link to play it, then save it to your library and skip back and forth through it.
  - Discover searches SoundCloud in a new tab. Copy any link from there and paste it back to play.

## Apps
| | |
|---|---|
| System | Settings, Files, Terminal, Text Editor, App Store, Task Manager, About |
| Productivity | Notes, Calculator, Clock (world clock, alarms, stopwatch, timer), Calendar (with event alerts), Reminders |
| Communication | Phone (keypad, recents, contacts — calls go to your device's dialer) |
| Media | Gallery, Camera, Music player, Cloud Music (SoundCloud), Voice Recorder, Paint |
| Internet | Browser, Maps (OpenStreetMap), Weather (live, Open-Meteo) |
| Games | Snake, plus 2048 and Tic-Tac-Toe from the Store |
| Tools | Converter (from the Store), any website you add as a web app |

Terminal commands: `help`, `ls`, `cd`, `cat`, `mkdir`, `touch`, `rm`, `mv`, `cp`, `echo > file`, `edit`, `open`, `apps`, `theme`, `mode`, `calc`, `notify`, `weather`, `neofetch`, `history`, `lock`, `reboot`, `shutdown`, `exit`.

## Keyboard shortcuts
| Keys | Action |
|---|---|
| `Ctrl+Shift+D` | Dark mode on/off |
| `Ctrl+Shift+E` | Exit OS / come back (toggle) |
| `Ctrl+K` | Search |
| `Ctrl+/` | Show all shortcuts |
| `Ctrl+Shift+M` | Next mode |
| `Ctrl+Shift+1 / 2 / 3` | Phone / Tablet / Laptop |
| `Ctrl+Shift+C` | Control Centre |
| `Ctrl+Shift+N` | Notifications |
| `Ctrl+Shift+A` | App switcher |
| `Ctrl+Shift+H` | Home |
| `Ctrl+Shift+Q` | Close app |
| `Ctrl+Shift+L` | Lock |
| `Ctrl+Shift+P` | Power menu |
| `Ctrl+Shift+↑ / ↓` | Volume |
| `Ctrl+Shift+← / →` | Brightness |
| `Alt+← / → / ↑ / ↓` | Snap left / right / maximise / minimise (laptop) |
| `Esc` | Close panel / back / unlock |

There are also always-visible buttons for **Dark mode**, **Mode** and **Exit OS** in the corner.

## Make your own app
Add this to `js/apps.js`:
```js
window.BV_APPS.push({
  id: "hello", name: "Hello", icon: "👋", bg: "#2f6bff", cat: "Other",
  render(body, os) { body.innerHTML = "<h2>Hi!</h2>"; os.notify({ app: "hello", icon: "👋", title: "Hi", text: "My app works" }); }
});
```
`os` gives your app access to `fs`, `store`, `idb`, `notify`, `toast`, `open`, `close`, `setMode`, `toggleDark` and more (see `js/os.js`).

## Files
```
index.html        layout          css/style.css    themes, modes, styles
js/lib.js         storage, file system, helpers
js/os.js          the shell: modes, windows, search, notifications, lock, power, shortcuts
js/apps.js        system & productivity apps
js/apps-media.js  media, internet & game apps
js/apps-store.js  Blockvile Store, Cloud Music, web apps, 2048, Tic-Tac-Toe, Converter
sw.js             offline cache    manifest.json   install-as-app
```

## Limits
This is a web-based OS, so it runs inside a browser:
- It can't be flashed onto a phone as firmware.
- Wi-Fi and Bluetooth toggles are visual only.
- Alarms only ring while the page is open.
- Some websites refuse to load inside the built-in Browser. Use the ↗ button to open them in your real browser.
- Cloud Music needs internet. Searching happens on SoundCloud's website, because searching inside the app would need a SoundCloud developer key.
- The PIN only protects the OS screen. It is not strong security.
