use crate::construct_chat::{
    emit_delta, emit_done, emit_error, emit_thinking_delta, message_text_content,
    ollama_image_payloads, system_prompt, ChatMessage,
};
use futures_util::StreamExt;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::time::Duration;
use tauri::{AppHandle, Emitter};

const DEFAULT_OLLAMA_HOST: &str = "http://127.0.0.1:11434";
const DEFAULT_MODEL: &str = "llama3.2:3b";

fn ollama_host() -> String {
    std::env::var("OLLAMA_HOST")
        .ok()
        .filter(|s| !s.trim().is_empty())
        .unwrap_or_else(|| DEFAULT_OLLAMA_HOST.to_string())
        .trim_end_matches('/')
        .to_string()
}

fn http() -> Result<Client, String> {
    Client::builder()
        .timeout(Duration::from_secs(600))
        .build()
        .map_err(|e| e.to_string())
}

fn format_ollama_http_error(status: reqwest::StatusCode, body: &str) -> String {
    let trimmed = body.trim();
    if let Ok(value) = serde_json::from_str::<Value>(trimmed) {
        if let Some(err) = value.get("error").and_then(|v| v.as_str()) {
            if !err.trim().is_empty() {
                return err.trim().to_string();
            }
        }
    }
    format!("Ollama chat HTTP {status}: {body}")
}

#[derive(Serialize)]
struct OllamaChatRequest {
    model: String,
    messages: Vec<OllamaMessage>,
    stream: bool,
}

#[derive(Serialize)]
struct OllamaMessage {
    role: String,
    content: String,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    images: Vec<String>,
}

#[derive(Deserialize)]
struct TagsResponse {
    models: Vec<TagModel>,
}

#[derive(Deserialize)]
struct TagModel {
    name: String,
    size: Option<u64>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OllamaLocalModelRow {
    pub name: String,
    pub size_bytes: u64,
}

async fn resolve_model(model_override: Option<String>) -> Result<String, String> {
    let trimmed = model_override.unwrap_or_default().trim().to_string();
    if !trimmed.is_empty() {
        return Ok(trimmed);
    }
    let list = ollama_list_local_models().await?;
    if let Some(first) = list.first() {
        return Ok(first.name.clone());
    }
    Ok(DEFAULT_MODEL.to_string())
}

fn system_prompt_ollama(reply_in_english: bool, prefer_ukrainian: bool) -> Option<String> {
    system_prompt(reply_in_english, prefer_ukrainian)
}

fn to_ollama_messages(
    messages: &[ChatMessage],
    reply_in_english: bool,
    prefer_ukrainian: bool,
) -> Vec<OllamaMessage> {
    let mut out = Vec::new();
    if let Some(system) = system_prompt_ollama(reply_in_english, prefer_ukrainian) {
        out.push(OllamaMessage {
            role: "system".to_string(),
            content: system,
            images: vec![],
        });
    }
    for m in messages {
        let role = match m.role.as_str() {
            "assistant" => "assistant",
            "system" => "system",
            _ => "user",
        };
        let content = message_text_content(m.content.clone());
        let images = ollama_image_payloads(m.images.as_deref());
        out.push(OllamaMessage {
            role: role.to_string(),
            content,
            images,
        });
    }
    out
}

#[tauri::command]
pub async fn ollama_list_local_models() -> Result<Vec<OllamaLocalModelRow>, String> {
    let client = http()?;
    let url = format!("{}/api/tags", ollama_host());
    let resp = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Ollama not reachable at {url}: {e}"))?;
    if !resp.status().is_success() {
        return Err(format!("Ollama /api/tags HTTP {}", resp.status()));
    }
    let body: TagsResponse = resp.json().await.map_err(|e| e.to_string())?;
    let mut rows: Vec<OllamaLocalModelRow> = body
        .models
        .into_iter()
        .map(|m| OllamaLocalModelRow {
            name: m.name,
            size_bytes: m.size.unwrap_or(0),
        })
        .collect();
    rows.sort_by(|a, b| a.name.cmp(&b.name));
    Ok(rows)
}

async fn ollama_chat_once(model: &str, messages: Vec<OllamaMessage>) -> Result<String, String> {
    let client = http()?;
    let url = format!("{}/api/chat", ollama_host());
    let req = OllamaChatRequest {
        model: model.to_string(),
        messages,
        stream: false,
    };
    let resp = client
        .post(&url)
        .json(&req)
        .send()
        .await
        .map_err(|e| e.to_string())?;
    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        return Err(format_ollama_http_error(status, &body));
    }
    let value: Value = resp.json().await.map_err(|e| e.to_string())?;
    let content = value
        .pointer("/message/content")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    Ok(content)
}

#[tauri::command]
pub async fn ollama_translate(
    text: String,
    source_lang: String,
    target_lang: String,
    model: Option<String>,
) -> Result<String, String> {
    let model = resolve_model(model).await?;
    let prompt = format!(
        "Translate literally from {source_lang} to {target_lang}. \
         Output ONLY the translated text — no quotes, no preamble, no summaries, \
         do not describe or explain code blocks, do not add new sentences.\n\n{text}"
    );
    ollama_chat_once(
        &model,
        vec![OllamaMessage {
            role: "user".to_string(),
            content: prompt,
            images: vec![],
        }],
    )
    .await
}

async fn run_ollama_stream(
    app: AppHandle,
    stream_id: String,
    messages: Vec<ChatMessage>,
    model_override: Option<String>,
    reply_in_english: bool,
    prefer_ukrainian: bool,
) {
    let result = async {
        let model = resolve_model(model_override).await?;
        let client = http()?;
        let url = format!("{}/api/chat", ollama_host());
        let ollama_messages = to_ollama_messages(&messages, reply_in_english, prefer_ukrainian);
        let req = OllamaChatRequest {
            model,
            messages: ollama_messages,
            stream: true,
        };
        let resp = client
            .post(&url)
            .json(&req)
            .send()
            .await
            .map_err(|e| format!("Ollama request failed: {e}"))?;
        if !resp.status().is_success() {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            return Err(format_ollama_http_error(status, &body));
        }

        let mut stream = resp.bytes_stream();
        let mut line_buf = String::new();
        while let Some(chunk) = stream.next().await {
            let chunk = chunk.map_err(|e| e.to_string())?;
            line_buf.push_str(&String::from_utf8_lossy(&chunk));
            while let Some(pos) = line_buf.find('\n') {
                let line = line_buf[..pos].trim().to_string();
                line_buf = line_buf[pos + 1..].to_string();
                if line.is_empty() {
                    continue;
                }
                let value: Value = serde_json::from_str(&line).map_err(|e| e.to_string())?;
                if let Some(thinking) = value
                    .pointer("/message/thinking")
                    .and_then(|v| v.as_str())
                    .filter(|s| !s.is_empty())
                {
                    emit_thinking_delta(&app, &stream_id, thinking);
                }
                if let Some(delta) = value
                    .pointer("/message/content")
                    .and_then(|v| v.as_str())
                    .filter(|s| !s.is_empty())
                {
                    emit_delta(&app, &stream_id, delta);
                }
                if value.get("done").and_then(|v| v.as_bool()) == Some(true) {
                    emit_done(&app, &stream_id);
                    return Ok(());
                }
            }
        }
        emit_done(&app, &stream_id);
        Ok(())
    }
    .await;

    if let Err(e) = result {
        emit_error(&app, &stream_id, &e);
    }
}

#[tauri::command]
pub async fn lavash_construct_chat_stream_ollama(
    app: AppHandle,
    stream_id: String,
    messages: Vec<ChatMessage>,
    reply_in_english: bool,
    prefer_ukrainian: bool,
    user_signed_in: bool,
    model: Option<String>,
) -> Result<(), String> {
    let _ = user_signed_in;
    let app = app.clone();
    tauri::async_runtime::spawn(async move {
        run_ollama_stream(
            app,
            stream_id,
            messages,
            model,
            reply_in_english,
            prefer_ukrainian,
        )
        .await;
    });
    Ok(())
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct OllamaModelEvent {
    model: String,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct OllamaPullLogEvent {
    model: String,
    line: String,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct OllamaPullFinishedEvent {
    model: String,
    ok: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<String>,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct OllamaRmFinishedEvent {
    model: String,
    ok: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<String>,
}

#[tauri::command]
pub async fn ollama_pull_model(app: AppHandle, model: String) -> Result<(), String> {
    let model = model.trim().to_string();
    if model.is_empty() {
        return Err("Model name is required".to_string());
    }
    let app = app.clone();
    tauri::async_runtime::spawn(async move {
        let _ = app.emit(
            "ollama-model-pull-started",
            OllamaModelEvent {
                model: model.clone(),
            },
        );
        let result = async {
            let client = http()?;
            let url = format!("{}/api/pull", ollama_host());
            let resp = client
                .post(&url)
                .json(&json!({ "name": model, "stream": true }))
                .send()
                .await
                .map_err(|e| format!("Ollama pull failed: {e}"))?;
            if !resp.status().is_success() {
                let status = resp.status();
                let body = resp.text().await.unwrap_or_default();
                return Err(format!("Ollama pull HTTP {status}: {body}"));
            }
            let mut stream = resp.bytes_stream();
            let mut line_buf = String::new();
            while let Some(chunk) = stream.next().await {
                let chunk = chunk.map_err(|e| e.to_string())?;
                line_buf.push_str(&String::from_utf8_lossy(&chunk));
                while let Some(pos) = line_buf.find('\n') {
                    let line = line_buf[..pos].trim().to_string();
                    line_buf = line_buf[pos + 1..].to_string();
                    if line.is_empty() {
                        continue;
                    }
                    let value: Value = serde_json::from_str(&line).map_err(|e| e.to_string())?;
                    let status = value
                        .get("status")
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                        .trim();
                    if !status.is_empty() {
                        let _ = app.emit(
                            "ollama-model-pull-log",
                            OllamaPullLogEvent {
                                model: model.clone(),
                                line: status.to_string(),
                            },
                        );
                    }
                }
            }
            Ok(())
        }
        .await;
        match result {
            Ok(()) => {
                let _ = app.emit(
                    "ollama-model-pull-finished",
                    OllamaPullFinishedEvent {
                        model,
                        ok: true,
                        error: None,
                    },
                );
            }
            Err(error) => {
                let _ = app.emit(
                    "ollama-model-pull-finished",
                    OllamaPullFinishedEvent {
                        model,
                        ok: false,
                        error: Some(error),
                    },
                );
            }
        }
    });
    Ok(())
}

#[tauri::command]
pub async fn ollama_rm_model(app: AppHandle, model: String) -> Result<(), String> {
    let model = model.trim().to_string();
    if model.is_empty() {
        return Err("Model name is required".to_string());
    }
    let app = app.clone();
    tauri::async_runtime::spawn(async move {
        let _ = app.emit(
            "ollama-model-rm-started",
            OllamaModelEvent {
                model: model.clone(),
            },
        );
        let result = async {
            let client = http()?;
            let url = format!("{}/api/delete", ollama_host());
            let resp = client
                .delete(&url)
                .json(&json!({ "name": model }))
                .send()
                .await
                .map_err(|e| format!("Ollama delete failed: {e}"))?;
            if !resp.status().is_success() {
                let status = resp.status();
                let body = resp.text().await.unwrap_or_default();
                return Err(format!("Ollama delete HTTP {status}: {body}"));
            }
            Ok(())
        }
        .await;
        match result {
            Ok(()) => {
                let _ = app.emit(
                    "ollama-model-rm-finished",
                    OllamaRmFinishedEvent {
                        model,
                        ok: true,
                        error: None,
                    },
                );
            }
            Err(error) => {
                let _ = app.emit(
                    "ollama-model-rm-finished",
                    OllamaRmFinishedEvent {
                        model,
                        ok: false,
                        error: Some(error),
                    },
                );
            }
        }
    });
    Ok(())
}
