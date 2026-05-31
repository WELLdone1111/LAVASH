use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use tauri::{AppHandle, Emitter};

pub const STREAM_EVENT: &str = "lc-chat-stream";

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StreamEventPayload {
    pub stream_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub delta: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub thinking_delta: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub done: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatImage {
    pub mime_type: String,
    pub data: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
    #[serde(default)]
    pub images: Option<Vec<ChatImage>>,
}

pub fn emit_stream(app: &AppHandle, payload: StreamEventPayload) {
    let _ = app.emit(STREAM_EVENT, payload);
}

pub fn emit_delta(app: &AppHandle, stream_id: &str, delta: &str) {
    emit_stream(
        app,
        StreamEventPayload {
            stream_id: stream_id.to_string(),
            delta: Some(delta.to_string()),
            thinking_delta: None,
            done: None,
            error: None,
        },
    );
}

pub fn emit_thinking_delta(app: &AppHandle, stream_id: &str, delta: &str) {
    emit_stream(
        app,
        StreamEventPayload {
            stream_id: stream_id.to_string(),
            delta: None,
            thinking_delta: Some(delta.to_string()),
            done: None,
            error: None,
        },
    );
}

pub fn emit_done(app: &AppHandle, stream_id: &str) {
    emit_stream(
        app,
        StreamEventPayload {
            stream_id: stream_id.to_string(),
            delta: None,
            thinking_delta: None,
            done: Some(true),
            error: None,
        },
    );
}

pub fn emit_error(app: &AppHandle, stream_id: &str, error: &str) {
    emit_stream(
        app,
        StreamEventPayload {
            stream_id: stream_id.to_string(),
            delta: None,
            thinking_delta: None,
            done: None,
            error: Some(error.to_string()),
        },
    );
}

pub fn system_prompt(reply_in_english: bool, prefer_ukrainian: bool) -> Option<String> {
    if reply_in_english {
        return Some(
            "LAVASH Construct design IDE. Reply in English only. When creating UI, output complete markdown code fences (lavash-panel / lavash-artboard) — not manual user steps.".to_string(),
        );
    }
    if prefer_ukrainian {
        return Some(
            "LAVASH Construct — IDE для UI-дизайну. Reply in Ukrainian only. Для нових компонентів на артборді завжди давай повні markdown code fences (lavash-panel / lavash-artboard), а не інструкції «відкрий вкладку / Ctrl+S».".to_string(),
        );
    }
    None
}

pub fn message_text_content(content: String) -> String {
    let trimmed = content.trim();
    if trimmed.is_empty() {
        ".".to_string()
    } else {
        content
    }
}

fn normalize_mime(mime_type: &str) -> String {
    let m = mime_type.trim().to_lowercase();
    if m == "image/jpg" {
        "image/jpeg".to_string()
    } else {
        m
    }
}

pub fn build_gemini_parts(content: String, images: Option<&[ChatImage]>) -> Vec<Value> {
    let mut parts = Vec::new();
    let text = message_text_content(content);
    let has_images = images.is_some_and(|i| !i.is_empty());
    if !has_images || text.trim() != "." {
        parts.push(json!({ "text": text }));
    }
    if let Some(images) = images {
        for img in images {
            let data = img.data.trim();
            if data.is_empty() {
                continue;
            }
            parts.push(json!({
                "inlineData": {
                    "mimeType": normalize_mime(&img.mime_type),
                    "data": data,
                }
            }));
        }
    }
    if parts.is_empty() {
        parts.push(json!({ "text": "." }));
    }
    parts
}

pub fn build_openai_content(content: String, images: Option<&[ChatImage]>) -> Value {
    let has_images = images.is_some_and(|i| i.iter().any(|img| !img.data.trim().is_empty()));
    if !has_images {
        return json!(message_text_content(content));
    }
    let mut parts: Vec<Value> = Vec::new();
    let text = message_text_content(content);
    parts.push(json!({ "type": "text", "text": text }));
    if let Some(images) = images {
        for img in images {
            let data = img.data.trim();
            if data.is_empty() {
                continue;
            }
            let mime = normalize_mime(&img.mime_type);
            parts.push(json!({
                "type": "image_url",
                "image_url": {
                    "url": format!("data:{mime};base64,{data}"),
                }
            }));
        }
    }
    json!(parts)
}

pub fn build_anthropic_content(content: String, images: Option<&[ChatImage]>) -> Value {
    let images = images.filter(|i| !i.is_empty());
    if images.is_none() {
        return json!(message_text_content(content));
    }
    let mut blocks: Vec<Value> = Vec::new();
    let text = message_text_content(content);
    if !text.trim().is_empty() {
        blocks.push(json!({ "type": "text", "text": text }));
    }
    if let Some(images) = images {
        for img in images {
            let data = img.data.trim();
            if data.is_empty() {
                continue;
            }
            blocks.push(json!({
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": normalize_mime(&img.mime_type),
                    "data": data,
                }
            }));
        }
    }
    if blocks.is_empty() {
        json!(".")
    } else {
        json!(blocks)
    }
}

pub fn ollama_image_payloads(images: Option<&[ChatImage]>) -> Vec<String> {
    let mut out = Vec::new();
    if let Some(images) = images {
        for img in images {
            let data = img.data.trim();
            if !data.is_empty() {
                out.push(data.to_string());
            }
        }
    }
    out
}

pub fn format_http_error(provider: &str, status: reqwest::StatusCode, body: &str) -> String {
    let trimmed = body.trim();
    if let Ok(value) = serde_json::from_str::<serde_json::Value>(trimmed) {
        for key in ["error", "message"] {
            if let Some(err) = value.get(key) {
                if let Some(s) = err.as_str() {
                    if !s.trim().is_empty() {
                        return format!("{provider}: {}", s.trim());
                    }
                }
                if let Some(obj) = err.as_object() {
                    if let Some(msg) = obj.get("message").and_then(|v| v.as_str()) {
                        if !msg.trim().is_empty() {
                            return format!("{provider}: {}", msg.trim());
                        }
                    }
                }
            }
        }
    }
    format!("{provider} HTTP {status}: {body}")
}

pub fn trim_base_url(base_url: &str) -> String {
    base_url.trim().trim_end_matches('/').to_string()
}
