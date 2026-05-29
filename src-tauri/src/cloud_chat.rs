use crate::construct_chat::{
    build_anthropic_content, build_gemini_parts, build_openai_content, emit_delta, emit_done,
    emit_error, format_http_error, message_text_content, system_prompt, trim_base_url, ChatMessage,
};
use futures_util::StreamExt;
use reqwest::header::{HeaderMap, HeaderValue, AUTHORIZATION, CONTENT_TYPE};
use reqwest::Client;
use serde_json::{json, Value};
use std::time::Duration;
use tauri::AppHandle;

fn http() -> Result<Client, String> {
    Client::builder()
        .timeout(Duration::from_secs(600))
        .build()
        .map_err(|e| e.to_string())
}

fn spawn_stream_task(
    app: AppHandle,
    stream_id: String,
    task: impl std::future::Future<Output = Result<(), String>> + Send + 'static,
) {
    tauri::async_runtime::spawn(async move {
        if let Err(e) = task.await {
            emit_error(&app, &stream_id, &e);
        }
    });
}

fn parse_sse_data_line(line: &str) -> Option<&str> {
    let trimmed = line.trim();
    if trimmed.is_empty() || trimmed.starts_with(':') {
        return None;
    }
    trimmed.strip_prefix("data:").map(str::trim)
}

async fn read_sse_response<F>(resp: reqwest::Response, mut on_data: F) -> Result<(), String>
where
    F: FnMut(&str) -> Result<bool, String>,
{
    let mut stream = resp.bytes_stream();
    let mut line_buf = String::new();
    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| e.to_string())?;
        line_buf.push_str(&String::from_utf8_lossy(&chunk));
        while let Some(pos) = line_buf.find('\n') {
            let line = line_buf[..pos].to_string();
            line_buf = line_buf[pos + 1..].to_string();
            let Some(data) = parse_sse_data_line(&line) else {
                continue;
            };
            if data == "[DONE]" {
                return Ok(());
            }
            if on_data(data)? {
                return Ok(());
            }
        }
    }
    Ok(())
}

fn gemini_role(role: &str) -> &'static str {
    match role {
        "assistant" => "model",
        _ => "user",
    }
}

fn build_gemini_body(messages: &[ChatMessage], reply_in_english: bool, prefer_ukrainian: bool) -> Value {
    let mut contents = Vec::new();
    for m in messages {
        if m.role == "system" {
            continue;
        }
        contents.push(json!({
            "role": gemini_role(&m.role),
            "parts": build_gemini_parts(m.content.clone(), m.images.as_deref()),
        }));
    }
    if contents.is_empty() {
        contents.push(json!({
            "role": "user",
            "parts": [{ "text": "." }],
        }));
    }
    let mut body = json!({ "contents": contents });
    if let Some(system) = system_prompt(reply_in_english, prefer_ukrainian) {
        body["systemInstruction"] = json!({
            "parts": [{ "text": system }],
        });
    }
    for m in messages.iter().filter(|m| m.role == "system") {
        let extra = message_text_content(m.content.clone());
        if let Some(obj) = body.get_mut("systemInstruction") {
            if let Some(parts) = obj.pointer_mut("/parts/0/text").and_then(|v| v.as_str()) {
                obj["parts"][0]["text"] = json!(format!("{parts}\n\n{extra}"));
            }
        } else {
            body["systemInstruction"] = json!({ "parts": [{ "text": extra }] });
        }
    }
    body
}

async fn run_gemini_stream(
    app: AppHandle,
    stream_id: String,
    api_key: String,
    model: String,
    messages: Vec<ChatMessage>,
    reply_in_english: bool,
    prefer_ukrainian: bool,
) -> Result<(), String> {
    let api_key = api_key.trim().to_string();
    if api_key.is_empty() {
        return Err("Gemini API key is required.".to_string());
    }
    let model = model.trim().to_string();
    if model.is_empty() {
        return Err("Gemini model is required.".to_string());
    }

    let client = http()?;
    let url = format!(
        "https://generativelanguage.googleapis.com/v1beta/models/{model}:streamGenerateContent?alt=sse&key={api_key}"
    );
    let body = build_gemini_body(&messages, reply_in_english, prefer_ukrainian);
    let resp = client
        .post(&url)
        .header(CONTENT_TYPE, "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Gemini request failed: {e}"))?;
    if !resp.status().is_success() {
        let status = resp.status();
        let text = resp.text().await.unwrap_or_default();
        return Err(format_http_error("Gemini", status, &text));
    }

    read_sse_response(resp, |data| {
        let value: Value = serde_json::from_str(data).map_err(|e| e.to_string())?;
        if let Some(text) = value
            .pointer("/candidates/0/content/parts/0/text")
            .and_then(|v| v.as_str())
            .filter(|s| !s.is_empty())
        {
            emit_delta(&app, &stream_id, text);
        }
        Ok(false)
    })
    .await?;
    emit_done(&app, &stream_id);
    Ok(())
}

fn openai_headers(api_key: &str, http_referer: Option<&str>) -> Result<HeaderMap, String> {
    let mut headers = HeaderMap::new();
    headers.insert(
        AUTHORIZATION,
        HeaderValue::from_str(&format!("Bearer {}", api_key.trim()))
            .map_err(|e| e.to_string())?,
    );
    headers.insert(CONTENT_TYPE, HeaderValue::from_static("application/json"));
    if let Some(referer) = http_referer.map(str::trim).filter(|s| !s.is_empty()) {
        headers.insert(
            "HTTP-Referer",
            HeaderValue::from_str(referer).map_err(|e| e.to_string())?,
        );
    }
    Ok(headers)
}

fn anthropic_headers(api_key: &str) -> Result<HeaderMap, String> {
    let mut headers = HeaderMap::new();
    headers.insert(
        "x-api-key",
        HeaderValue::from_str(api_key.trim()).map_err(|e| e.to_string())?,
    );
    headers.insert(
        "anthropic-version",
        HeaderValue::from_static("2023-06-01"),
    );
    headers.insert(CONTENT_TYPE, HeaderValue::from_static("application/json"));
    Ok(headers)
}

fn is_anthropic_base(base_url: &str) -> bool {
    base_url.to_ascii_lowercase().contains("anthropic.com")
}

fn to_anthropic_messages(messages: &[ChatMessage]) -> Vec<Value> {
    let mut out = Vec::new();
    for m in messages {
        if m.role == "system" {
            continue;
        }
        let role = if m.role == "assistant" {
            "assistant"
        } else {
            "user"
        };
        out.push(json!({
            "role": role,
            "content": build_anthropic_content(m.content.clone(), m.images.as_deref()),
        }));
    }
    if out.is_empty() {
        out.push(json!({ "role": "user", "content": "." }));
    }
    out
}

async fn run_anthropic_stream(
    app: AppHandle,
    stream_id: String,
    provider_label: String,
    api_key: String,
    base_url: String,
    model: String,
    messages: Vec<ChatMessage>,
    reply_in_english: bool,
    prefer_ukrainian: bool,
) -> Result<(), String> {
    let client = http()?;
    let url = format!("{}/messages", trim_base_url(&base_url));
    let mut body = json!({
        "model": model,
        "max_tokens": 8192,
        "messages": to_anthropic_messages(&messages),
        "stream": true,
    });
    if let Some(system) = system_prompt(reply_in_english, prefer_ukrainian) {
        body["system"] = json!(system);
    }
    for m in messages.iter().filter(|m| m.role == "system") {
        let extra = message_text_content(m.content.clone());
        if let Some(existing) = body.get("system").and_then(|v| v.as_str()) {
            body["system"] = json!(format!("{existing}\n\n{extra}"));
        } else {
            body["system"] = json!(extra);
        }
    }

    let resp = client
        .post(&url)
        .headers(anthropic_headers(&api_key)?)
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("{provider_label} request failed: {e}"))?;
    if !resp.status().is_success() {
        let status = resp.status();
        let text = resp.text().await.unwrap_or_default();
        return Err(format_http_error(&provider_label, status, &text));
    }

    read_sse_response(resp, |data| {
        let value: Value = serde_json::from_str(data).map_err(|e| e.to_string())?;
        let event_type = value.get("type").and_then(|v| v.as_str()).unwrap_or("");
        if event_type == "content_block_delta" {
            if let Some(text) = value
                .pointer("/delta/text")
                .and_then(|v| v.as_str())
                .filter(|s| !s.is_empty())
            {
                emit_delta(&app, &stream_id, text);
            }
        }
        if event_type == "message_stop" {
            return Ok(true);
        }
        Ok(false)
    })
    .await?;
    emit_done(&app, &stream_id);
    Ok(())
}

async fn run_openai_compat_stream(
    app: AppHandle,
    stream_id: String,
    provider_label: String,
    api_key: String,
    base_url: String,
    model: String,
    messages: Vec<ChatMessage>,
    reply_in_english: bool,
    prefer_ukrainian: bool,
    http_referer: Option<String>,
) -> Result<(), String> {
    let api_key = api_key.trim().to_string();
    if api_key.is_empty() {
        return Err(format!("{provider_label} API key is required."));
    }
    let base = trim_base_url(&base_url);
    if base.is_empty() {
        return Err(format!("{provider_label} base URL is required."));
    }
    let model = model.trim().to_string();
    if model.is_empty() {
        return Err(format!("{provider_label} model is required."));
    }

    if is_anthropic_base(&base) {
        return run_anthropic_stream(
            app,
            stream_id,
            provider_label,
            api_key,
            base,
            model,
            messages,
            reply_in_english,
            prefer_ukrainian,
        )
        .await;
    }

    let client = http()?;
    let url = format!("{base}/chat/completions");
    let mut oai_messages: Vec<Value> = Vec::new();
    if let Some(system) = system_prompt(reply_in_english, prefer_ukrainian) {
        oai_messages.push(json!({ "role": "system", "content": system }));
    }
    for m in &messages {
        let role = match m.role.as_str() {
            "assistant" => "assistant",
            "system" => "system",
            _ => "user",
        };
        oai_messages.push(json!({
            "role": role,
            "content": build_openai_content(m.content.clone(), m.images.as_deref()),
        }));
    }
    let body = json!({
        "model": model,
        "messages": oai_messages,
        "stream": true,
    });
    let resp = client
        .post(&url)
        .headers(openai_headers(&api_key, http_referer.as_deref())?)
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("{provider_label} request failed: {e}"))?;
    if !resp.status().is_success() {
        let status = resp.status();
        let text = resp.text().await.unwrap_or_default();
        return Err(format_http_error(&provider_label, status, &text));
    }

    read_sse_response(resp, |data| {
        let value: Value = serde_json::from_str(data).map_err(|e| e.to_string())?;
        if let Some(text) = value
            .pointer("/choices/0/delta/content")
            .and_then(|v| v.as_str())
            .filter(|s| !s.is_empty())
        {
            emit_delta(&app, &stream_id, text);
        }
        Ok(false)
    })
    .await?;
    emit_done(&app, &stream_id);
    Ok(())
}

#[tauri::command]
pub async fn lavash_construct_chat_stream_gemini(
    app: AppHandle,
    stream_id: String,
    api_key: String,
    model: String,
    messages: Vec<ChatMessage>,
    reply_in_english: bool,
    prefer_ukrainian: bool,
    user_signed_in: bool,
) -> Result<(), String> {
    let _ = user_signed_in;
    let app = app.clone();
    spawn_stream_task(
        app.clone(),
        stream_id.clone(),
        run_gemini_stream(
            app,
            stream_id,
            api_key,
            model,
            messages,
            reply_in_english,
            prefer_ukrainian,
        ),
    );
    Ok(())
}

#[tauri::command]
pub async fn lavash_construct_chat_stream_openai_compat(
    app: AppHandle,
    stream_id: String,
    provider_label: String,
    api_key: String,
    base_url: String,
    model: String,
    messages: Vec<ChatMessage>,
    reply_in_english: bool,
    prefer_ukrainian: bool,
    user_signed_in: bool,
    http_referer: Option<String>,
) -> Result<(), String> {
    let _ = user_signed_in;
    let app = app.clone();
    spawn_stream_task(
        app.clone(),
        stream_id.clone(),
        run_openai_compat_stream(
            app,
            stream_id,
            provider_label,
            api_key,
            base_url,
            model,
            messages,
            reply_in_english,
            prefer_ukrainian,
            http_referer,
        ),
    );
    Ok(())
}
