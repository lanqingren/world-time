use tauri::tray::TrayIconBuilder;
use tauri::{Emitter, Manager};

#[tauri::command]
fn quit(app: tauri::AppHandle) {
    app.exit(0);
}

/// Tauri's own popup command keeps the webview's resource table locked until the menu closes,
/// so a menu or store call made meanwhile (the clock updates its menu every minute) deadlocks
/// the app. Take the menu out of the table first and pop it up with the lock released.
#[tauri::command]
async fn popup_menu<R: tauri::Runtime>(
    webview: tauri::Webview<R>,
    window: tauri::Window<R>,
    rid: tauri::ResourceId,
) -> Result<(), String> {
    use tauri::menu::ContextMenu;
    let menu = webview
        .resources_table()
        .get::<tauri::menu::Menu<R>>(rid)
        .map_err(|e| e.to_string())?;
    menu.popup(window).map_err(|e| e.to_string())
}

/// Keep the clock on every desktop, over full-screen apps, out of Mission Control and Cmd-`.
#[cfg(target_os = "macos")]
fn float_on_every_space(window: &tauri::WebviewWindow) {
    use objc2::msg_send;
    use objc2::runtime::AnyObject;

    const CAN_JOIN_ALL_SPACES: usize = 1 << 0;
    const STATIONARY: usize = 1 << 4;
    const IGNORES_CYCLE: usize = 1 << 6;
    const FULL_SCREEN_AUXILIARY: usize = 1 << 8;
    const STATUS_WINDOW_LEVEL: isize = 25;

    if let Ok(ptr) = window.ns_window() {
        let ns_window = ptr as *mut AnyObject;
        unsafe {
            let behavior = CAN_JOIN_ALL_SPACES | STATIONARY | IGNORES_CYCLE | FULL_SCREEN_AUXILIARY;
            let _: () = msg_send![ns_window, setCollectionBehavior: behavior];
            let _: () = msg_send![ns_window, setLevel: STATUS_WINDOW_LEVEL];
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // opening the app again brings the clock back (see "reopen" in main.ts)
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            let _ = app.emit_to("main", "reopen", ());
        }))
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .invoke_handler(tauri::generate_handler![quit, popup_menu])
        .setup(|app| {
            // no Dock icon: the clock lives in the menu bar
            #[cfg(target_os = "macos")]
            app.set_activation_policy(tauri::ActivationPolicy::Accessory);

            #[cfg(target_os = "macos")]
            if let Some(window) = app.get_webview_window("main") {
                float_on_every_space(&window);
            }

            // the menu itself is attached from the clock window's script
            #[cfg(target_os = "macos")]
            let icon = tauri::image::Image::from_bytes(include_bytes!("../icons/tray-template.png"))?;
            #[cfg(not(target_os = "macos"))]
            let icon = app.default_window_icon().cloned().expect("app icon");
            TrayIconBuilder::with_id("main")
                .icon(icon)
                .icon_as_template(cfg!(target_os = "macos"))
                .tooltip("World Time")
                .show_menu_on_left_click(true)
                .build(app)?;
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building World Time")
        .run(|_app, _event| {
            // macOS doesn't start a second copy when the app is opened again, it sends this instead
            #[cfg(target_os = "macos")]
            if let tauri::RunEvent::Reopen { .. } = _event {
                let _ = _app.emit_to("main", "reopen", ());
            }
        });
}
