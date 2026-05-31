use tauri::WebviewWindow;

#[cfg(windows)]
fn hex_to_colorref(hex: &str) -> Option<u32> {
    let hex = hex.trim().trim_start_matches('#');
    if hex.len() != 6 {
        return None;
    }
    let r = u32::from_str_radix(&hex[0..2], 16).ok()?;
    let g = u32::from_str_radix(&hex[2..4], 16).ok()?;
    let b = u32::from_str_radix(&hex[4..6], 16).ok()?;
    Some(r | (g << 8) | (b << 16))
}

#[cfg(windows)]
fn apply_caption_color(window: &WebviewWindow, color: &str) -> Result<(), String> {
    use windows::Win32::Graphics::Dwm::{
        DwmSetWindowAttribute, DWMWINDOWATTRIBUTE, DWMWA_USE_IMMERSIVE_DARK_MODE,
    };

    const DWMWA_CAPTION_COLOR: DWMWINDOWATTRIBUTE = DWMWINDOWATTRIBUTE(35);
    const DWMWA_TEXT_COLOR: DWMWINDOWATTRIBUTE = DWMWINDOWATTRIBUTE(36);

    let hwnd = window
        .hwnd()
        .map_err(|e| format!("window hwnd: {e}"))?;

    let caption = hex_to_colorref(color).ok_or_else(|| format!("invalid color: {color}"))?;
    // Білий текст/іконки кнопок на темному title bar (Windows 11+).
    let caption_text: u32 = 0x00FF_FFFF;

    unsafe {
        let dark_mode: u32 = 1;
        let _ = DwmSetWindowAttribute(
            hwnd,
            DWMWA_USE_IMMERSIVE_DARK_MODE,
            &dark_mode as *const _ as *const _,
            std::mem::size_of::<u32>() as u32,
        );

        DwmSetWindowAttribute(
            hwnd,
            DWMWA_CAPTION_COLOR,
            &caption as *const _ as *const _,
            std::mem::size_of::<u32>() as u32,
        )
        .map_err(|e| format!("DWMWA_CAPTION_COLOR: {e}"))?;

        let _ = DwmSetWindowAttribute(
            hwnd,
            DWMWA_TEXT_COLOR,
            &caption_text as *const _ as *const _,
            std::mem::size_of::<u32>() as u32,
        );
    }

    Ok(())
}

#[cfg(not(windows))]
fn apply_caption_color(_window: &WebviewWindow, _color: &str) -> Result<(), String> {
    Ok(())
}

pub fn sync_window_caption_color(window: &WebviewWindow, color: &str) -> Result<(), String> {
    apply_caption_color(window, color)
}

#[cfg(windows)]
fn apply_rounded_corners(window: &WebviewWindow, round: bool) -> Result<(), String> {
    use windows::Win32::Graphics::Dwm::{DwmSetWindowAttribute, DWMWINDOWATTRIBUTE};

    const DWMWA_WINDOW_CORNER_PREFERENCE: DWMWINDOWATTRIBUTE = DWMWINDOWATTRIBUTE(33);
    const DWMWCP_DONOTROUND: u32 = 1;
    const DWMWCP_ROUND: u32 = 2;

    let hwnd = window
        .hwnd()
        .map_err(|e| format!("window hwnd: {e}"))?;
    let preference = if round { DWMWCP_ROUND } else { DWMWCP_DONOTROUND };

    unsafe {
        DwmSetWindowAttribute(
            hwnd,
            DWMWA_WINDOW_CORNER_PREFERENCE,
            &preference as *const _ as *const _,
            std::mem::size_of::<u32>() as u32,
        )
        .map_err(|e| format!("DWMWA_WINDOW_CORNER_PREFERENCE: {e}"))?;
    }

    Ok(())
}

#[cfg(not(windows))]
fn apply_rounded_corners(_window: &WebviewWindow, _round: bool) -> Result<(), String> {
    Ok(())
}

pub fn sync_window_rounded_corners(window: &WebviewWindow, round: bool) -> Result<(), String> {
    apply_rounded_corners(window, round)
}

/// Win32 SetWindowRgn — прозорі кути + click-through поза заокругленням (CSS radius).
#[cfg(windows)]
fn apply_hit_region(window: &WebviewWindow, round: bool, radius_logical: f64) -> Result<(), String> {
    use windows::Win32::Foundation::HWND;
    use windows::Win32::Graphics::Gdi::{CreateRoundRectRgn, SetWindowRgn};

    let hwnd: HWND = window.hwnd().map_err(|e| format!("window hwnd: {e}"))?;
    let size = window.inner_size().map_err(|e| format!("inner_size: {e}"))?;
    let scale = window.scale_factor().map_err(|e| format!("scale_factor: {e}"))?;

    let width = size.width as i32;
    let height = size.height as i32;

    unsafe {
        if !round || width <= 0 || height <= 0 {
            let ok = SetWindowRgn(hwnd, None, true);
            if ok == 0 {
                return Err("SetWindowRgn(clear) failed".into());
            }
            return Ok(());
        }

        let radius = (radius_logical * scale).round().clamp(1.0, 256.0) as i32;
        let diameter = radius * 2;
        let rgn = CreateRoundRectRgn(0, 0, width + 1, height + 1, diameter, diameter);
        if rgn.is_invalid() {
            return Err("CreateRoundRectRgn failed".into());
        }
        let ok = SetWindowRgn(hwnd, Some(rgn), true);
        if ok == 0 {
            return Err("SetWindowRgn failed".into());
        }
    }

    Ok(())
}

#[cfg(not(windows))]
fn apply_hit_region(_window: &WebviewWindow, _round: bool, _radius_logical: f64) -> Result<(), String> {
    Ok(())
}

pub fn sync_window_hit_region(
    window: &WebviewWindow,
    round: bool,
    radius_logical: f64,
) -> Result<(), String> {
    apply_hit_region(window, round, radius_logical)
}

#[tauri::command]
pub fn set_window_hit_region(
    window: WebviewWindow,
    round: bool,
    radius: Option<f64>,
) -> Result<(), String> {
    sync_window_hit_region(&window, round, radius.unwrap_or(16.0))
}

#[tauri::command]
pub fn lavash_reclaim_window_input() -> Result<(), String> {
    Ok(())
}

#[tauri::command]
pub fn set_window_rounded_corners(window: WebviewWindow, round: bool) -> Result<(), String> {
    sync_window_rounded_corners(&window, round)
}

#[tauri::command]
pub fn set_window_caption_color(window: WebviewWindow, color: String) -> Result<(), String> {
    sync_window_caption_color(&window, &color)
}
