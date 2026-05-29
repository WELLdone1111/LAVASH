use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::time::Duration;

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GeminiImageGenerateArgs {
    pub api_key: String,
    pub prompt: String,
    #[serde(default)]
    pub model: Option<String>,
    #[serde(default)]
    pub aspect_ratio: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GeminiImageGenerateResult {
    pub mime_type: String,
    pub data_base64: String,
    pub width: Option<u32>,
    pub height: Option<u32>,
}

fn http() -> Result<Client, String> {
    Client::builder()
        .timeout(Duration::from_secs(180))
        .build()
        .map_err(|e| e.to_string())
}

fn default_image_model() -> &'static str {
    "gemini-2.5-flash-image"
}

fn extract_inline_image(value: &Value) -> Option<(String, String)> {
    let parts = value.pointer("/candidates/0/content/parts")?.as_array()?;
    for part in parts {
        if let Some(inline) = part.get("inlineData").or_else(|| part.get("inline_data")) {
            let mime = inline
                .get("mimeType")
                .or_else(|| inline.get("mime_type"))
                .and_then(|v| v.as_str())
                .unwrap_or("image/png");
            let data = inline.get("data").and_then(|v| v.as_str())?;
            if !data.trim().is_empty() {
                return Some((mime.to_string(), data.trim().to_string()));
            }
        }
    }
    None
}

#[tauri::command]
pub async fn lavash_construct_generate_gemini_image(
    api_key: String,
    prompt: String,
    model: Option<String>,
    aspect_ratio: Option<String>,
) -> Result<GeminiImageGenerateResult, String> {
    lavash_construct_generate_gemini_image_inner(GeminiImageGenerateArgs {
        api_key,
        prompt,
        model,
        aspect_ratio,
    })
    .await
}

async fn lavash_construct_generate_gemini_image_inner(
    args: GeminiImageGenerateArgs,
) -> Result<GeminiImageGenerateResult, String> {
    let api_key = args.api_key.trim();
    if api_key.is_empty() {
        return Err("Gemini API key is required.".to_string());
    }
    let prompt = args.prompt.trim();
    if prompt.is_empty() {
        return Err("Image prompt is required.".to_string());
    }
    let model = args
        .model
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .unwrap_or(default_image_model());

    let mut generation_config = json!({
        "responseModalities": ["TEXT", "IMAGE"],
    });
    if let Some(ratio) = args.aspect_ratio.as_deref().map(str::trim).filter(|s| !s.is_empty()) {
        generation_config["imageConfig"] = json!({ "aspectRatio": ratio });
    }

    let body = json!({
        "contents": [{
            "role": "user",
            "parts": [{ "text": prompt }],
        }],
        "generationConfig": generation_config,
    });

    let client = http()?;
    let url = format!(
        "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
    );
    let resp = client
        .post(&url)
        .header(reqwest::header::CONTENT_TYPE, "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Gemini image request failed: {e}"))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let text = resp.text().await.unwrap_or_default();
        return Err(crate::construct_chat::format_http_error("Gemini Image", status, &text));
    }

    let value: Value = resp.json().await.map_err(|e| e.to_string())?;
    let (mime_type, data_base64) = extract_inline_image(&value)
        .ok_or_else(|| "Gemini returned no image. Try gemini-2.5-flash-image or Nano Banana model.".to_string())?;

    Ok(GeminiImageGenerateResult {
        mime_type,
        data_base64,
        width: None,
        height: None,
    })
}
